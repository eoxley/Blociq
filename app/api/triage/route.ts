import { NextResponse } from "next/server";
import { triageEmail } from "@/lib/ai/triage";
import { makeGraphRequest } from "@/lib/outlookAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { IncomingEmail } from "@/lib/ai/triageSchema";

export async function POST(req: Request) {
  try {
    // Safe environment variable check
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: "AI triage not configured - missing OpenAI API key" 
      }, { status: 400 });
    }

    const { messageId, bulkTriage } = await req.json();
    
    if (bulkTriage) {
      return await performBulkTriage();
    }
    
    if (!messageId) {
      return NextResponse.json({ error: "messageId required" }, { status: 400 });
    }

    return await performSingleTriage(messageId);

  } catch (error: any) {
    console.error("Triage error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to triage message" 
    }, { status: 500 });
  }
}

async function performBulkTriage() {
  try {
    const inboxResponse = await makeGraphRequest('/me/mailFolders/inbox/messages?$top=100&$orderby=receivedDateTime desc');
    
    if (!inboxResponse.ok) {
      throw new Error(`Failed to fetch inbox messages: ${inboxResponse.status}`);
    }

    const inboxData = await inboxResponse.json();
    const messages = inboxData.value || [];
    
    if (messages.length === 0) {
      return NextResponse.json({
        message: "No messages found in inbox",
        triage: { processed: 0, actions: [] }
      });
    }

    const results = [];
    const actions = [];

    for (const message of messages) {
      try {
        const rawEmail: IncomingEmail = {
          subject: message.subject || "",
          body: message.body?.content || "",
          from: message.from?.emailAddress?.address || "",
          to: message.toRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || [],
          cc: message.ccRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || [],
          date: message.receivedDateTime,
          plainText: message.bodyPreview || ""
        };

        const triageResult = await triageEmail(rawEmail);

        if (triageResult) {
          const messageActions = await performTriageActions(message.id, triageResult, message);
          
          results.push({
            messageId: message.id,
            subject: message.subject,
            category: triageResult.label,
            priority: triageResult.priority,
            actions: messageActions,
            attachments: triageResult.attachments_suggestions || []
          });

          actions.push(...messageActions.map(action => `${message.subject}: ${action}`));
        }
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        results.push({
          messageId: message.id,
          subject: message.subject,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: "Bulk triage completed",
      triage: {
        processed: results.length,
        results,
        actions,
        summary: `Processed ${results.length} emails. Please review your draft replies.`
      }
    });

  } catch (error: any) {
    throw new Error(`Bulk triage failed: ${error.message}`);
  }
}

async function performSingleTriage(messageId: string) {
  try {
    console.log('Performing single triage for message:', messageId)
    
    // Fetch message details from Outlook
    const messageResponse = await makeGraphRequest(`/me/messages/${messageId}?$select=subject,body,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview`);
    
    if (!messageResponse.ok) {
      console.error('Failed to fetch message:', messageResponse.status, messageResponse.statusText)
      throw new Error(`Failed to fetch message: ${messageResponse.status}`);
    }

    const message = await messageResponse.json();
    console.log('Fetched message:', { subject: message.subject, from: message.from?.emailAddress?.address })

    // Prepare email data for triage
    const rawEmail: IncomingEmail = {
      subject: message.subject || "",
      body: message.body?.content || "",
      from: message.from?.emailAddress?.address || "",
      to: message.toRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || [],
      cc: message.ccRecipients?.map((r: any) => r.emailAddress?.address || r.emailAddress) || [],
      date: message.receivedDateTime,
      plainText: message.bodyPreview || ""
    };

    console.log('Prepared email data for triage:', { 
      subject: rawEmail.subject, 
      from: rawEmail.from,
      hasBody: !!rawEmail.body,
      hasPlainText: !!rawEmail.plainText
    })

    // Perform AI triage
    const triageResult = await triageEmail(rawEmail);
    console.log('Triage result:', triageResult)

    if (!triageResult) {
      throw new Error("AI triage failed to return a result");
    }

    // NEW: Enhanced categorization with urgency and property detection
    const enhancedTriage = {
      // Keep existing AI categorization
      ...triageResult,
      
      // Add urgency detection
      urgency: detectUrgency(rawEmail, message),
      
      // Add property extraction
      properties: extractProperties(rawEmail),
      
      // Add actionable insights
      insights: generateEmailInsights(rawEmail),
      
      // Add suggested actions
      suggestedActions: getSuggestedActions(rawEmail, triageResult)
    };

    // Store enhanced data in incoming_emails table
    try {
      await supabaseAdmin
        .from('incoming_emails')
        .upsert({
          message_id: messageId,
          subject: rawEmail.subject,
          from_email: rawEmail.from,
          body_preview: rawEmail.plainText,
          received_at: rawEmail.date,
          ai_tag: enhancedTriage.label,
          triage_category: enhancedTriage.subcategory || enhancedTriage.label,
          urgency_level: enhancedTriage.urgency.level,
          urgency_score: enhancedTriage.urgency.score,
          mentioned_properties: enhancedTriage.properties,
          ai_insights: enhancedTriage.insights,
          suggested_actions: enhancedTriage.suggestedActions,
          unread: true,
          handled: false
        }, {
          onConflict: 'message_id'
        });
      console.log('Enhanced triage data saved to database');
    } catch (dbError) {
      console.error('Failed to save enhanced triage data:', dbError);
      // Don't fail the entire operation if database save fails
    }

    // Perform triage actions
    const actions = await performTriageActions(messageId, enhancedTriage, message);
    console.log('Triage actions performed:', actions)

    return NextResponse.json({
      message: "Enhanced triage completed successfully",
      triage: enhancedTriage,
      actions
    });

  } catch (error: any) {
    console.error("Single triage error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to triage message",
      details: error.stack
    }, { status: 500 });
  }
}

async function performTriageActions(messageId: string, triageResult: any, originalMessage: any) {
  const actions: string[] = [];
  
  try {
    if (triageResult.label) {
      await applyEmailCategory(messageId, triageResult.label);
      actions.push(`Applied category: ${triageResult.label}`);
    }

    if (triageResult.label === "urgent") {
      await setEmailImportance(messageId, "high");
      actions.push("Set importance to high");
    }

    if (triageResult.reply?.body_markdown) {
      const draftId = await createIntelligentDraftReply(messageId, triageResult.reply, originalMessage);
      if (draftId) {
        actions.push(`Created intelligent draft reply (ID: ${draftId})`);
      }
    }

    if (triageResult.label === "follow_up" && triageResult.due_date) {
      await setFollowUpFlag(messageId, triageResult.due_date);
      actions.push(`Set follow-up flag for ${triageResult.due_date}`);
    }

    if (triageResult.label === "archive_candidate") {
      await moveToArchive(messageId);
      actions.push("Moved to archive folder");
    }

  } catch (error) {
    console.error("Error performing triage actions:", error);
    actions.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return actions;
}

async function applyEmailCategory(messageId: string, category: string) {
  // Map our categories to Outlook categories
  const categoryMap: { [key: string]: string } = {
    urgent: "Urgent",
    follow_up: "Follow Up",
    resolved: "Resolved",
    archive_candidate: "Archive"
  };

  const outlookCategory = categoryMap[category] || category;
  
  // Add category to the email
  const response = await makeGraphRequest(`/me/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      categories: [outlookCategory]
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to apply category: ${response.status}`);
  }
}

async function setEmailImportance(messageId: string, importance: "low" | "normal" | "high") {
  const response = await makeGraphRequest(`/me/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      importance: importance
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to set importance: ${response.status}`);
  }
}

async function createIntelligentDraftReply(messageId: string, replyData: any, originalMessage: any) {
  try {
    // Create the draft reply
    const replyResponse = await makeGraphRequest(`/me/messages/${messageId}/createReply`, {
      method: 'POST'
    });

    if (!replyResponse.ok) {
      throw new Error(`Failed to create reply draft: ${replyResponse.status}`);
    }

    const replyDraft = await replyResponse.json();
    const draftId = replyDraft.id;

    // Generate intelligent reply content with building context
    const intelligentReply = await generateIntelligentReply(originalMessage, replyData);

    // Update the draft with intelligent content
    const subject = replyData.subject || `Re: ${originalMessage.subject || 'Email'}`;

    const updateResponse = await makeGraphRequest(`/me/messages/${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        subject: subject,
        body: {
          contentType: "HTML",
          content: intelligentReply
        }
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update draft content: ${updateResponse.status}`);
    }

    // Save draft to local database for the drafts panel
    try {
      await saveDraftToDatabase(messageId, replyData, intelligentReply, originalMessage);
    } catch (dbError) {
      console.warn("Failed to save draft to local database:", dbError);
      // Don't fail the entire operation if local save fails
    }

    return draftId;
  } catch (error) {
    console.error("Error creating intelligent draft reply:", error);
    throw error;
  }
}

async function saveDraftToDatabase(messageId: string, replyData: any, content: string, originalMessage: any) {
  try {
    // Extract building info for context
    const buildingInfo = await extractBuildingInfo(originalMessage);
    
    // Get the current user from the request context
    // Since this is called from the triage API, we need to get the user from the request
    const userResponse = await makeGraphRequest('/me');
    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }
    const user = await userResponse.json();
    
    // Create draft data
    const draftData = {
      type: 'reply',
      email_id: messageId,
      building_id: buildingInfo?.id || null,
      content: content,
      context: JSON.stringify({
        original_subject: originalMessage.subject,
        original_from: originalMessage.from?.emailAddress?.address,
        building_context: buildingInfo,
        triage_category: replyData.category || 'follow_up',
        triage_priority: replyData.priority || 'P2'
      })
    };

    // Save to local database via our drafts API
    const saveResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/drafts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(draftData),
    });

    if (!saveResponse.ok) {
      throw new Error(`Failed to save draft to database: ${saveResponse.status}`);
    }

    console.log('Successfully saved draft to local database');
  } catch (error) {
    console.error('Error saving draft to database:', error);
    throw error;
  }
}

async function generateIntelligentReply(originalMessage: any, baseReply: any) {
  try {
    const buildingInfo = await extractBuildingInfo(originalMessage);
    const leaseholderInfo = await extractLeaseholderInfo(originalMessage);
    const relevantDocuments = await findRelevantDocuments(originalMessage);

    let intelligentContent = baseReply.body_markdown;

    // Add building context if available
    if (buildingInfo) {
      intelligentContent += `\n\n<strong>Building Context:</strong>\n`;
      intelligentContent += `• Building: ${buildingInfo.name}\n`;
      intelligentContent += `• Address: ${buildingInfo.address}\n`;
      if (buildingInfo.manager) {
        intelligentContent += `• Property Manager: ${buildingInfo.manager}\n`;
      }
    }

    // Add leaseholder context if available
    if (leaseholderInfo) {
      intelligentContent += `\n<strong>Leaseholder Information:</strong>\n`;
      intelligentContent += `• Unit: ${leaseholderInfo.unit}\n`;
      intelligentContent += `• Leaseholder: ${leaseholderInfo.name}\n`;
      if (leaseholderInfo.contact) {
        intelligentContent += `• Contact: ${leaseholderInfo.contact}\n`;
      }
    }

    // Add relevant documents if available
    if (relevantDocuments.length > 0) {
      intelligentContent += `\n<strong>Relevant Documents:</strong>\n`;
      relevantDocuments.forEach(doc => {
        intelligentContent += `• ${doc.name} (${doc.type})\n`;
      });
      intelligentContent += `\n<em>Note: These documents have been attached to this draft for your reference.</em>`;
    }

    // Add standard signature
    intelligentContent += `\n\n<hr>\n<strong>Kind regards,</strong><br>`;
    intelligentContent += `Property Management Team<br>`;
    intelligentContent += `Blociq`;

    return intelligentContent;

  } catch (error) {
    console.error("Error generating intelligent reply:", error);
    // Fallback to base reply if context generation fails
    return baseReply.body_markdown;
  }
}

async function extractBuildingInfo(message: any) {
  try {
    // Search for building references in email content
    const content = `${message.subject} ${message.bodyPreview} ${message.body?.content || ''}`;
    
    // Look for building names, addresses, or references
    const buildingPatterns = [
      /building[:\s]+([^\n\r,]+)/i,
      /property[:\s]+([^\n\r,]+)/i,
      /address[:\s]+([^\n\r,]+)/i,
      /block[:\s]+([^\n\r,]+)/i
    ];

    for (const pattern of buildingPatterns) {
      const match = content.match(pattern);
      if (match) {
        // Query building database for more details
        const { data: building } = await supabaseAdmin
          .from('buildings')
          .select('*')
          .ilike('name', `%${match[1].trim()}%`)
          .single();

        if (building) {
          return {
            name: building.name,
            address: building.address,
            manager: building.property_manager
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting building info:", error);
    return null;
  }
}

async function extractLeaseholderInfo(message: any) {
  try {
    const content = `${message.subject} ${message.bodyPreview} ${message.body?.content || ''}`;
    
    // Look for leaseholder references
    const leaseholderPatterns = [
      /leaseholder[:\s]+([^\n\r,]+)/i,
      /tenant[:\s]+([^\n\r,]+)/i,
      /unit[:\s]+([^\n\r,]+)/i,
      /apartment[:\s]+([^\n\r,]+)/i
    ];

    for (const pattern of leaseholderPatterns) {
      const match = content.match(pattern);
      if (match) {
        // Query leaseholder database
        const { data: leaseholder } = await supabaseAdmin
          .from('leaseholders')
          .select('*')
          .ilike('name', `%${match[1].trim()}%`)
          .single();

        if (leaseholder) {
          return {
            unit: leaseholder.unit,
            name: leaseholder.name,
            contact: leaseholder.email || leaseholder.phone
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error extracting leaseholder info:", error);
    return null;
  }
}

async function findRelevantDocuments(message: any) {
  try {
    const content = `${message.subject} ${message.bodyPreview} ${message.body?.content || ''}`;
    
    // Look for document requests or references
    const documentKeywords = ['document', 'certificate', 'report', 'inspection', 'maintenance', 'compliance'];
    const relevantDocs = [];

    for (const keyword of documentKeywords) {
      if (content.toLowerCase().includes(keyword)) {
        // Query document database for relevant files
        const { data: documents } = await supabaseAdmin
          .from('documents')
          .select('*')
          .ilike('name', `%${keyword}%`)
          .limit(3);

        if (documents && documents.length > 0) {
          relevantDocs.push(...documents.map(doc => ({
            name: doc.name,
            type: doc.type || 'Document'
          })));
        }
      }
    }

    return relevantDocs;
  } catch (error) {
    console.error("Error finding relevant documents:", error);
    return [];
  }
}

async function setFollowUpFlag(messageId: string, dueDate: string) {
  try {
    // Set a follow-up flag with the due date
    const flagResponse = await makeGraphRequest(`/me/messages/${messageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        flag: {
          flagStatus: "flagged",
          dueDateTime: {
            dateTime: dueDate,
            timeZone: "UTC"
          }
        }
      })
    });

    if (!flagResponse.ok) {
      throw new Error(`Failed to set follow-up flag: ${flagResponse.status}`);
    }
  } catch (error) {
    console.error("Error setting follow-up flag:", error);
    throw error;
  }
}

async function moveToArchive(messageId: string) {
  try {
    // Get the archive folder ID first
    const foldersResponse = await makeGraphRequest('/me/mailFolders');
    if (!foldersResponse.ok) {
      throw new Error(`Failed to get folders: ${foldersResponse.status}`);
    }

    const folders = await foldersResponse.json();
    const archiveFolder = folders.value?.find((f: any) => 
      f.displayName.toLowerCase() === 'archive' || 
      f.displayName.toLowerCase() === 'archived'
    );

    if (!archiveFolder) {
      throw new Error("Archive folder not found");
    }

    // Move the message to archive
    const moveResponse = await makeGraphRequest(`/me/messages/${messageId}/move`, {
      method: 'POST',
      body: JSON.stringify({
        destinationId: archiveFolder.id
      })
    });

    if (!moveResponse.ok) {
      throw new Error(`Failed to move to archive: ${moveResponse.status}`);
    }
  } catch (error) {
    console.error("Error moving to archive:", error);
    throw error;
  }
}

// NEW: Enhanced triage helper functions

// Urgency detection function
function detectUrgency(email: IncomingEmail, originalMessage?: any) {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  
  const urgencyKeywords = {
    critical: ['emergency', 'urgent', 'asap', 'immediate', 'critical', 'fire', 'flood', 'gas leak', 'water leak', 'electrical fault'],
    high: ['important', 'priority', 'soon', 'today', 'leak', 'broken', 'not working', 'dangerous', 'safety'],
    medium: ['maintenance', 'repair', 'issue', 'problem', 'concern', 'noise', 'heating'],
    low: ['inquiry', 'question', 'request', 'information', 'general']
  };

  let level = 'low';
  let score = 0;

  // Check Microsoft importance flag first
  if (originalMessage?.importance === 'high') {
    score += 5;
  }

  // Keyword scoring
  for (const [urgencyLevel, keywords] of Object.entries(urgencyKeywords)) {
    const matches = keywords.filter(keyword => text.includes(keyword));
    if (matches.length > 0) {
      const levelScore = {
        critical: 10,
        high: 7,
        medium: 4,
        low: 1
      }[urgencyLevel];
      
      score = Math.max(score, levelScore + matches.length);
      
      if (levelScore >= 7) level = urgencyLevel;
    }
  }

  // Time-based urgency (recent emails mentioning deadlines)
  const timeUrgent = /\b(today|tomorrow|deadline|due|expires?|urgent|asap)\b/i.test(text);
  if (timeUrgent) score += 3;

  // Fire safety and legal urgency
  const legalUrgent = /\b(fire safety|compliance|legal|court|enforcement|notice)\b/i.test(text);
  if (legalUrgent) score += 4;

  // Final level determination
  if (score >= 8) level = 'critical';
  else if (score >= 5) level = 'high';
  else if (score >= 2) level = 'medium';

  return { level, score };
}

// Property extraction function
function extractProperties(email: IncomingEmail) {
  const text = `${email.subject} ${email.body}`;
  
  // Common property naming patterns for UK properties
  const propertyPatterns = [
    /\b([A-Z][a-z]+\s+(House|Manor|Gardens|Lodge|Court|Place|Tower|Heights|Apartments?|Building))\b/g,
    /\b(Building\s+[A-Z]|\d+\s+[A-Z][a-z]+\s+(Street|Road|Avenue|Close|Drive|Lane))\b/g,
    /\b([A-Z][a-z]+\s+Apartments?)\b/g,
    /\b(\d+\s+[A-Z][a-z]+\s+(Street|Road|Avenue|Close|Drive|Lane))\b/g,
    /\b([A-Z][a-z]+\s+(Estate|Development|Complex))\b/g
  ];

  const found = new Set();

  propertyPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => found.add(match.trim()));
    }
  });

  return Array.from(found);
}

// Generate actionable insights
function generateEmailInsights(email: IncomingEmail) {
  const insights = [];
  const text = `${email.subject} ${email.body}`.toLowerCase();

  // Detect follow-up needs
  if (text.includes('follow up') || text.includes('following up') || text.includes('chasing')) {
    insights.push({
      type: 'follow_up',
      message: 'This appears to be a follow-up email',
      action: 'Check if previous issue was resolved',
      priority: 'medium'
    });
  }

  // Detect recurring issues
  if (text.includes('again') || text.includes('still') || text.includes('repeatedly') || text.includes('ongoing')) {
    insights.push({
      type: 'recurring',
      message: 'This may be a recurring issue',
      action: 'Review previous emails from this sender',
      priority: 'high'
    });
  }

  // Detect batch processable items
  if (text.includes('service charge') || text.includes('payment') || text.includes('invoice') || text.includes('statement')) {
    insights.push({
      type: 'batch_processable',
      message: 'This email may be batch processable',
      action: 'Group with similar service charge emails',
      priority: 'low'
    });
  }

  // Detect compliance/legal matters
  if (text.includes('compliance') || text.includes('legal') || text.includes('enforcement') || text.includes('notice')) {
    insights.push({
      type: 'compliance',
      message: 'This email contains compliance or legal matters',
      action: 'Escalate to compliance team immediately',
      priority: 'critical'
    });
  }

  // Detect maintenance requests
  if (text.includes('repair') || text.includes('fix') || text.includes('broken') || text.includes('maintenance')) {
    insights.push({
      type: 'maintenance',
      message: 'Maintenance request detected',
      action: 'Create work order and assign contractor',
      priority: 'medium'
    });
  }

  // Detect potential complaints
  if (text.includes('complaint') || text.includes('unhappy') || text.includes('dissatisfied') || text.includes('poor service')) {
    insights.push({
      type: 'complaint',
      message: 'Potential complaint detected',
      action: 'Acknowledge receipt and schedule investigation',
      priority: 'high'
    });
  }

  return insights;
}

// Get suggested actions based on category and content
function getSuggestedActions(email: IncomingEmail, triageResult: any) {
  const actions = [];
  const text = `${email.subject} ${email.body}`.toLowerCase();
  
  // Category-based actions
  switch (triageResult.label || triageResult.category) {
    case 'maintenance':
    case 'MAINT':
      actions.push('Create work order', 'Schedule inspection', 'Assign to contractor', 'Update resident');
      break;
      
    case 'complaint':
    case 'COMP':
      actions.push('Acknowledge receipt', 'Schedule investigation', 'Set follow-up reminder', 'Escalate if needed');
      break;
      
    case 'service_charge':
    case 'SC':
      actions.push('Send payment details', 'Update account', 'Schedule payment plan', 'Provide breakdown');
      break;
      
    case 'fire_safety':
    case 'FS':
      actions.push('Urgent: Schedule inspection', 'Contact fire safety team', 'Update compliance log', 'Document evidence');
      break;
      
    case 'urgent':
      actions.push('Immediate response required', 'Escalate to senior team', 'Call resident if needed');
      break;
      
    case 'legal':
    case 'LEG':
      actions.push('Review with legal team', 'Document everything', 'Prepare formal response', 'Escalate to management');
      break;
      
    default:
      actions.push('Reply within 24 hours', 'File appropriately', 'Forward to relevant team');
  }

  // Content-based additional actions
  if (text.includes('emergency') || text.includes('urgent')) {
    actions.unshift('PRIORITY: Handle immediately');
  }
  
  if (text.includes('payment') || text.includes('money') || text.includes('invoice')) {
    actions.push('Check payment status', 'Send receipt if applicable');
  }
  
  if (text.includes('noise') || text.includes('disturbance')) {
    actions.push('Log noise complaint', 'Contact other residents if needed');
  }

  // Remove duplicates and limit to 6 actions
  return [...new Set(actions)].slice(0, 6);
}
