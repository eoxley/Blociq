let messages = [];
let currentEmailContext = null;
let currentBuildingContext = null;

// DOM elements
const chatContainer = document.getElementById('chatContainer');
const inputField = document.getElementById('inputField');
const sendButton = document.getElementById('sendButton');
const triageInboxBtn = document.getElementById('triageInbox');
const viewTriageResultsBtn = document.getElementById('viewTriageResults');
const logEmailBtn = document.getElementById('logEmail');
const getBuildingInfoBtn = document.getElementById('getBuildingInfo');
const manualLogEmailBtn = document.getElementById('manualLogEmail');
const aiReplySection = document.getElementById('aiReplySection');
const generateReplyBtn = document.getElementById('generateReply');
const generateReplyAllBtn = document.getElementById('generateReplyAll');
const generateForwardBtn = document.getElementById('generateForward');
const buildingContext = document.getElementById('buildingContext');
const buildingContextContent = document.getElementById('buildingContextContent');
const replyModeIndicator = document.getElementById('replyModeIndicator');

// Auto-resize textarea
function adjustTextareaHeight() {
  inputField.style.height = 'auto';
  const newHeight = Math.min(inputField.scrollHeight, 120);
  inputField.style.height = `${newHeight}px`;
}

inputField.addEventListener('input', adjustTextareaHeight);
inputField.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleAskBlocIQ();
  }
});

// Add message to chat
function addMessage(content, type = 'assistant') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.textContent = content;
  chatContainer.appendChild(messageDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  messages.push({ content, type, timestamp: new Date() });
}

// Enhanced Ask BlocIQ with building context
async function handleAskBlocIQ() {
  const question = inputField.value.trim();
  if (!question) return;
  
  // Add user message
  addMessage(question, 'user');
  inputField.value = '';
  adjustTextareaHeight();
  sendButton.disabled = true;
  
  // Add loading message
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'message assistant loading';
  loadingDiv.textContent = '🤔 Thinking...';
  chatContainer.appendChild(loadingDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  
  try {
    // Get current email context and building info
    const emailContext = await getCurrentEmailContext();
    const buildingContext = await detectBuildingFromEmail(emailContext);
    
    // Determine context type based on question and building
    const contextType = determineContextType(question, buildingContext);
    
    // Call BlocIQ Ask AI API with full context
    const response = await fetch('https://www.blociq.co.uk/api/ask-ai', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({ 
        prompt: question,
        building_id: buildingContext?.id || null,
        contextType: contextType,
        emailContext: emailContext,
        is_outlook_addin: true
      })
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Please log in to BlocIQ to use this feature');
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const answer = data.response || data.result || 'I received your question but couldn\'t process it properly.';
    
    // Remove loading message and add response
    chatContainer.removeChild(loadingDiv);
    addMessage(answer, 'assistant');
    
    // Update building context display if we have building info
    if (buildingContext) {
      updateBuildingContextDisplay(buildingContext);
    }
    
  } catch (error) {
    // Remove loading message and add error
    chatContainer.removeChild(loadingDiv);
    addMessage(`❌ Error: ${error.message}`, 'assistant');
  } finally {
    sendButton.disabled = false;
  }
}

// Detect building from email content
async function detectBuildingFromEmail(emailContext) {
  if (!emailContext) return null;
  
  try {
    // Try to extract building info from email content
    const response = await fetch('https://www.blociq.co.uk/api/ai-extract-building', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        subject: emailContext.subject,
        body: emailContext.body,
        from: emailContext.from
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.building) {
        currentBuildingContext = data.building;
        return data.building;
      }
    }
    
    // Fallback: try to match by sender domain or building references
    return await fallbackBuildingDetection(emailContext);
    
  } catch (error) {
    console.error('Error detecting building:', error);
    return null;
  }
}

// Fallback building detection
async function fallbackBuildingDetection(emailContext) {
  try {
    // Search for buildings by name/address in email content
    const searchTerms = extractSearchTerms(emailContext.subject + ' ' + emailContext.body);
    
    if (searchTerms.length > 0) {
      const response = await fetch('https://www.blociq.co.uk/api/buildings/search', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          query: searchTerms.join(' '),
          limit: 5
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.buildings && data.buildings.length > 0) {
          // Return the most relevant building
          return data.buildings[0];
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error in fallback building detection:', error);
    return null;
  }
}

// Extract search terms from text
function extractSearchTerms(text) {
  // Remove common words and extract potential building names/addresses
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  const words = text.toLowerCase().split(/\s+/);
  const searchTerms = words.filter(word => 
    word.length > 3 && 
    !commonWords.includes(word) &&
    /^[a-zA-Z0-9\s]+$/.test(word)
  );
  
  return searchTerms.slice(0, 5); // Limit to 5 terms
}

// Determine context type based on question and building
function determineContextType(question, buildingContext) {
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('compliance') || questionLower.includes('regulatory') || questionLower.includes('safety')) {
    return 'compliance';
  }
  
  if (questionLower.includes('leaseholder') || questionLower.includes('tenant') || questionLower.includes('resident')) {
    return 'leaseholder';
  }
  
  if (questionLower.includes('major works') || questionLower.includes('section 20') || questionLower.includes('project')) {
    return 'major_works';
  }
  
  if (buildingContext) {
    return 'general';
  }
  
  return 'public';
}

// Update building context display
function updateBuildingContextDisplay(building) {
  if (!building) return;
  
  buildingContext.style.display = 'block';
  buildingContextContent.innerHTML = `
    <p><span class="context-badge">🏢</span> <strong>${building.name || 'Unknown Building'}</strong></p>
    <p><span class="context-badge">📍</span> ${building.address || 'Address not available'}</p>
    ${building.unit_count ? `<p><span class="context-badge">🏠</span> ${building.unit_count} units</p>` : ''}
    ${building.is_hrb ? '<p><span class="context-badge">🛡️</span> High Risk Building</p>' : ''}
  `;
}

// Get current email context
async function getCurrentEmailContext() {
  const item = Office.context?.mailbox?.item;
  if (!item) return null;
  
  try {
    const [subject, body, to, from] = await Promise.all([
      getItemProperty(item.subject),
      getItemProperty(item.body),
      getItemProperty(item.to),
      getItemProperty(item.from)
    ]);
    
    return {
      subject: subject || '',
      body: body || '',
      to: to || '',
      from: from || '',
      itemId: item.itemId || '',
      itemType: item.itemType || 'unknown'
    };
  } catch (error) {
    console.error('Error getting email context:', error);
    return null;
  }
}

// Get item property safely
function getItemProperty(property) {
  return new Promise((resolve, reject) => {
    if (!property) {
      resolve('');
      return;
    }
    
    property.getAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve(result.value);
      } else {
        resolve('');
      }
    });
  });
}

// Get authentication token
async function getAuthToken() {
  // This would need to be implemented based on your auth system
  // For now, we'll use a placeholder
  return 'placeholder-token';
}

// Enhanced Triage Inbox functionality - Fixed and Working
async function handleTriageInbox() {
  addMessage('🚀 Starting AI inbox triage process...', 'assistant');
  
  try {
    // First, get the current user's inbox emails
    const inboxResponse = await fetch('https://www.blociq.co.uk/api/inbox/emails', {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      }
    });
    
    if (!inboxResponse.ok) {
      if (inboxResponse.status === 401) {
        throw new Error('Please log in to BlocIQ to use this feature');
      }
      throw new Error(`Failed to fetch inbox: ${inboxResponse.status}`);
    }
    
    const inboxData = await inboxResponse.json();
    const emails = inboxData.emails || inboxData.data || [];
    
    if (emails.length === 0) {
      addMessage('📭 No emails found in inbox to triage', 'assistant');
      return;
    }
    
    addMessage(`📧 Found ${emails.length} emails to triage`, 'assistant');
    addMessage('🤖 Starting AI analysis and draft generation...', 'assistant');
    
    // Process emails in batches to avoid overwhelming the system
    const batchSize = 3; // Process 3 emails at a time
    let processedCount = 0;
    
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      addMessage(`📋 Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(emails.length/batchSize)}`, 'assistant');
      
      for (const email of batch) {
        try {
          addMessage(`🔍 Analyzing: ${email.subject || 'No subject'}`, 'assistant');
          
          // Use the working ask-ai API for triage analysis
          const analysisResponse = await fetch('https://www.blociq.co.uk/api/ask-ai', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await getAuthToken()}`
            },
            body: JSON.stringify({
              prompt: `Analyze this email for property management triage. Provide:
1. Category (maintenance, compliance, leaseholder query, emergency, general)
2. Priority (high, medium, low)
3. Recommended action
4. Suggested response template

Email Subject: ${email.subject || 'No subject'}
Email Content: ${email.body || 'No content'}
From: ${email.from_email || 'Unknown sender'}`,
              building_id: email.building_id || null,
              contextType: 'email_triage',
              emailContext: {
                subject: email.subject,
                body: email.body,
                from: email.from_email,
                to: email.to_email,
                received_at: email.received_at
              },
              is_outlook_addin: true
            })
          });
          
          if (!analysisResponse.ok) {
            throw new Error(`Analysis failed: ${analysisResponse.status}`);
          }
          
          const analysisData = await analysisResponse.json();
          const analysis = analysisData.response || analysisData.result;
          
          if (analysis) {
            addMessage(`📊 Analysis complete for: ${email.subject || 'No subject'}`, 'assistant');
            
            // Generate draft response using the same API
            const draftResponse = await fetch('https://www.blociq.co.uk/api/ask-ai', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getAuthToken()}`
              },
              body: JSON.stringify({
                prompt: `Based on this email analysis, generate a professional response template for a UK property manager:

Analysis: ${analysis}

Email Subject: ${email.subject || 'No subject'}
Email Content: ${email.body || 'No content'}
From: ${email.from_email || 'Unknown sender'}

Generate a professional, helpful response that:
- Acknowledges the email
- Addresses the main points
- Provides next steps or timeline
- Maintains professional tone
- Is suitable for property management`,
                building_id: email.building_id || null,
                contextType: 'email_reply',
                emailContext: {
                  subject: email.subject,
                  body: email.body,
                  from: email.from_email,
                  to: email.to_email,
                  received_at: email.received_at
                },
                is_outlook_addin: true
              })
            });
            
            if (draftResponse.ok) {
              const draftData = await draftResponse.json();
              const draft = draftData.response || draftData.result;
              
              if (draft) {
                addMessage(`✍️ Draft generated for: ${email.subject || 'No subject'}`, 'assistant');
                
                // Store the triage result in the add-in's local storage for user reference
                const triageResult = {
                  emailId: email.id,
                  subject: email.subject,
                  analysis: analysis,
                  draft: draft,
                  timestamp: new Date().toISOString(),
                  buildingId: email.building_id
                };
                
                // Store in localStorage for user reference
                const existingTriage = JSON.parse(localStorage.getItem('blociq_triage_results') || '[]');
                existingTriage.push(triageResult);
                localStorage.setItem('blociq_triage_results', JSON.stringify(existingTriage));
                
                processedCount++;
              } else {
                addMessage(`⚠️ Draft generation failed for: ${email.subject || 'No subject'}`, 'assistant');
              }
            } else {
              addMessage(`⚠️ Draft generation failed for: ${email.subject || 'No subject'}`, 'assistant');
            }
          } else {
            addMessage(`⚠️ Analysis failed for: ${email.subject || 'No subject'}`, 'assistant');
          }
          
        } catch (error) {
          addMessage(`❌ Failed to process: ${email.subject || 'No subject'} - ${error.message}`, 'assistant');
        }
        
        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    addMessage(`🎉 Inbox triage complete! Processed ${processedCount} emails successfully.`, 'assistant');
    addMessage(`💡 Triage results are stored locally. You can review them in the add-in.`, 'assistant');
    
    // Show triage results summary
    showTriageResultsSummary();
    
  } catch (error) {
    console.error('Error in inbox triage:', error);
    addMessage(`❌ Inbox triage failed: ${error.message}`, 'assistant');
    addMessage(`💡 Make sure you're logged into BlocIQ and have access to your inbox.`, 'assistant');
  }
};

// Show triage results summary
function showTriageResultsSummary() {
  try {
    const triageResults = JSON.parse(localStorage.getItem('blociq_triage_results') || '[]');
    const recentResults = triageResults.slice(-5); // Show last 5 results
    
    if (recentResults.length > 0) {
      addMessage('📋 Recent Triage Results:', 'assistant');
      
      recentResults.forEach((result, index) => {
        addMessage(`${index + 1}. ${result.subject || 'No subject'} - ${result.timestamp ? new Date(result.timestamp).toLocaleDateString() : 'Unknown date'}`, 'assistant');
      });
      
      addMessage('💡 Use "Get Building Info" to see building context for these emails.', 'assistant');
    }
  } catch (error) {
    console.error('Error showing triage results:', error);
  }
}

// Enhanced function to show detailed triage results
function showTriageResults() {
  try {
    const triageResults = JSON.parse(localStorage.getItem('blociq_triage_results') || '[]');
    
    if (triageResults.length === 0) {
      addMessage('📭 No triage results found. Run "AI Triage Inbox" first to generate results.', 'assistant');
      return;
    }
    
    addMessage(`📋 Found ${triageResults.length} triage results:`, 'assistant');
    
    // Show results in reverse chronological order (newest first)
    const sortedResults = triageResults.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    sortedResults.forEach((result, index) => {
      const date = result.timestamp ? new Date(result.timestamp).toLocaleDateString('en-GB') : 'Unknown date';
      const time = result.timestamp ? new Date(result.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
      
      addMessage(`📧 ${index + 1}. ${result.subject || 'No subject'}`, 'assistant');
      addMessage(`   📅 ${date} at ${time}`, 'assistant');
      
      if (result.buildingId) {
        addMessage(`   🏢 Building ID: ${result.buildingId}`, 'assistant');
      }
      
      // Show analysis summary
      if (result.analysis) {
        const analysisPreview = result.analysis.substring(0, 150) + (result.analysis.length > 150 ? '...' : '');
        addMessage(`   📊 Analysis: ${analysisPreview}`, 'assistant');
      }
      
      // Show draft preview
      if (result.draft) {
        const draftPreview = result.draft.substring(0, 150) + (result.draft.length > 150 ? '...' : '');
        addMessage(`   ✍️ Draft: ${draftPreview}`, 'assistant');
      }
      
      addMessage('   ──────────────────────', 'assistant');
    });
    
    addMessage('💡 Use "Get Building Info" to see building context for these emails.', 'assistant');
    addMessage('💡 Triage results are stored locally in your browser.', 'assistant');
    
  } catch (error) {
    console.error('Error showing triage results:', error);
    addMessage('❌ Error displaying triage results', 'assistant');
  }
}

// Log Email functionality
logEmailBtn.onclick = async () => {
  addMessage('📝 Logging current email...', 'assistant');
  
  try {
    const emailContext = await getCurrentEmailContext();
    if (!emailContext) {
      addMessage('❌ No email context available', 'assistant');
      return;
    }
    
    const response = await fetch('https://www.blociq.co.uk/api/addin/log-email', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        subject: emailContext.subject,
        body: emailContext.body,
        from: emailContext.from,
        to: emailContext.to,
        itemId: emailContext.itemId,
        itemType: emailContext.itemType
      })
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Please log in to BlocIQ to use this feature');
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    addMessage(`✅ Email logged successfully!`, 'assistant');
    
    if (data.matched) {
      addMessage(`🏢 Matched to: ${data.matched.buildingName || 'Unknown building'}`, 'assistant');
    }
    
  } catch (error) {
    addMessage(`❌ Failed to log email: ${error.message}`, 'assistant');
  }
};

// Get Building Info functionality
getBuildingInfoBtn.onclick = async () => {
  addMessage('🏢 Getting building information...', 'assistant');
  
  try {
    const emailContext = await getCurrentEmailContext();
    if (!emailContext) {
      addMessage('❌ No email context available', 'assistant');
      return;
    }
    
    // Try to extract building info from email content
    const buildingInfo = await extractBuildingInfo(emailContext);
    
    if (buildingInfo) {
      addMessage(`🏢 Building: ${buildingInfo.name}`, 'assistant');
      addMessage(`📍 Address: ${buildingInfo.address}`, 'assistant');
      addMessage(`📊 Units: ${buildingInfo.unitCount}`, 'assistant');
      
      // Update building context
      currentBuildingContext = buildingInfo;
      updateBuildingContextDisplay(buildingInfo);
    } else {
      addMessage('❌ Could not identify building from email content', 'assistant');
    }
    
  } catch (error) {
    addMessage(`❌ Failed to get building info: ${error.message}`, 'assistant');
  }
};

// Extract building info from email content
async function extractBuildingInfo(emailContext) {
  const response = await fetch('https://www.blociq.co.uk/api/ai-extract-building', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getAuthToken()}`
    },
    body: JSON.stringify({
      subject: emailContext.subject,
      body: emailContext.body,
      from: emailContext.from
    })
  });
  
  if (!response.ok) return null;
  
  const data = await response.json();
  return data.building;
}

// Manual Log Email
manualLogEmailBtn.onclick = async () => {
  await logEmailBtn.onclick();
};

// AI Reply Generation (only available in compose mode)
generateReplyBtn.onclick = async () => {
  await generateAIReply('reply');
};

generateReplyAllBtn.onclick = async () => {
  await generateAIReply('replyAll');
};

generateForwardBtn.onclick = async () => {
  await generateAIReply('forward');
};

async function generateAIReply(replyType) {
  addMessage(`🤖 Generating AI ${replyType}...`, 'assistant');
  
  try {
    const emailContext = await getCurrentEmailContext();
    if (!emailContext) {
      addMessage('❌ No email context available', 'assistant');
      return;
    }
    
    // Use the same API as the application for consistency
    const response = await fetch('https://www.blociq.co.uk/api/ask-ai', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        prompt: `Generate a professional ${replyType} to this email. Consider the building context and maintain a professional tone suitable for property management.`,
        building_id: currentBuildingContext?.id || null,
        contextType: 'email_reply',
        emailContext: emailContext,
        replyType: replyType,
        is_outlook_addin: true
      })
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Please log in to BlocIQ to use this feature');
      }
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const generatedReply = data.response || data.result;
    
    if (generatedReply) {
      // Insert the reply into the email body
      Office.context.mailbox.item.body.setAsync(
        generatedReply,
        { coercionType: Office.CoercionType.Text },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            addMessage(`✅ AI ${replyType} generated and inserted!`, 'assistant');
            addMessage(`💡 You can now edit the generated text before sending.`, 'assistant');
          } else {
            addMessage(`❌ Failed to insert reply: ${result.error.message}`, 'assistant');
          }
        }
      );
    } else {
      addMessage(`❌ Failed to generate ${replyType}: No response from AI service`, 'assistant');
    }
    
  } catch (error) {
    addMessage(`❌ Failed to generate ${replyType}: ${error.message}`, 'assistant');
  }
}

// Automatic reply detection and AI generation
let isReplyMode = false;
let originalEmailContext = null;

// Enhanced email capture setup
function setupEmailCapture() {
  // Listen for email changes
  Office.context.mailbox.addHandlerAsync(Office.EventType.ItemChanged, handleItemChanged);
  
  // Listen for email sends
  Office.context.mailbox.addHandlerAsync(Office.EventType.ItemSend, handleItemSend);
  
  // Listen for reply/forward actions
  Office.context.mailbox.addHandlerAsync(Office.EventType.ItemChanged, detectReplyMode);
  
  addMessage('📧 Email capture system activated', 'assistant');
}

// Detect when user is in reply/forward mode
function detectReplyMode(event) {
  const item = Office.context?.mailbox?.item;
  if (!item) return;
  
  try {
    // Check if we're in reply mode by examining the item
    const currentSubject = item.subject?.getAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        const subject = result.value || '';
        const isReply = subject.toLowerCase().includes('re:') || subject.toLowerCase().includes('re:');
        const isForward = subject.toLowerCase().includes('fw:') || subject.toLowerCase().includes('fwd:');
        
        if (isReply || isForward) {
          isReplyMode = true;
          addMessage(`📧 ${isReply ? 'Reply' : 'Forward'} mode detected! Use the AI Reply buttons above to generate responses.`, 'assistant');
          
          // Show reply mode indicator
          replyModeIndicator.style.display = 'block';
          
          // Store original email context for better AI generation
          getCurrentEmailContext().then(context => {
            originalEmailContext = context;
          });
        } else {
          isReplyMode = false;
          replyModeIndicator.style.display = 'none';
        }
      }
    });
  } catch (error) {
    console.error('Error detecting reply mode:', error);
  }
}

// Enhanced item changed handler
function handleItemChanged(event) {
  currentEmailContext = null; // Reset context
  detectReplyMode(event); // Check for reply mode
  addMessage('📧 Email context updated', 'assistant');
}

// Enhanced item send handler
async function handleItemSend(event) {
  try {
    const emailContext = await getCurrentEmailContext();
    if (emailContext) {
      // Log the outgoing email
      await fetch('https://www.blociq.co.uk/api/addin/log-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          subject: emailContext.subject,
          body: emailContext.body,
          from: emailContext.from,
          to: emailContext.to,
          itemId: emailContext.itemId,
          itemType: emailContext.itemType,
          direction: 'outgoing',
          isReply: isReplyMode,
          originalContext: originalEmailContext
        })
      });
      
      addMessage('📧 Outgoing email logged to BlocIQ', 'assistant');
      
      // Reset reply mode
      isReplyMode = false;
      originalEmailContext = null;
    }
  } catch (error) {
    console.error('Error logging outgoing email:', error);
  }
}

// Check if we're in compose mode and show AI reply functionality
function checkComposeMode() {
  const item = Office.context?.mailbox?.item;
  if (item && item.itemType === Office.MailboxEnums.ItemType.Message) {
    // We're in compose mode - show AI reply functionality
    aiReplySection.classList.add('visible');
    addMessage('🤖 AI Reply functionality enabled for this email context', 'assistant');
    
    // Check if this is a reply/forward
    detectReplyMode();
  }
}

// Initialize add-in
Office.onReady(() => {
  addMessage('🚀 BlocIQ Add-in loaded successfully!', 'assistant');
  setupEmailCapture();
  checkComposeMode();
});

// Send button click handler - FIXED: Now properly connected
sendButton.onclick = handleAskBlocIQ;

// Enable send button when there's input - FIXED: Now properly working
inputField.addEventListener('input', () => {
  sendButton.disabled = !inputField.value.trim();
});

// Triage Inbox functionality
triageInboxBtn.onclick = async () => {
  await handleTriageInbox();
};

// View Triage Results functionality
viewTriageResultsBtn.onclick = () => {
  showTriageResults();
};
