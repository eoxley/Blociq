import { NextResponse } from "next/server";
import { classifyEmailForTriage } from "@/lib/ai/triage";
import { makeGraphRequest } from "@/lib/outlookAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { messageId } = await req.json();
    
    if (!messageId) {
      return NextResponse.json({ error: "messageId required" }, { status: 400 });
    }

    // Get the specific message from Outlook using the existing auth system
    const response = await makeGraphRequest(`/me/messages/${messageId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch message: ${response.status} - ${errorText}`);
    }

    const message = await response.json();
    
    // Classify the email using AI
    const triageResult = await classifyEmailForTriage({
      subject: message.subject || "",
      from: message.from?.emailAddress?.address,
      preview: message.bodyPreview,
      body: message.body?.content || ""
    });

    if (!triageResult) {
      throw new Error("Failed to classify email");
    }

    // Perform triage actions based on the classification
    const actionsPerformed = await performTriageActions(messageId, triageResult, message);

    // Store the triage result
    const { error: insertError } = await supabaseAdmin
      .from("ai_triage_actions")
      .insert({
        message_id: messageId,
        conversation_id: message.conversationId,
        internet_message_id: message.internetMessageId,
        category: triageResult.label,
        reason: triageResult.reason,
        due_date: triageResult.due_date,
        applied: true,
        applied_at: new Date().toISOString()
      });

    if (insertError) {
      console.warn("Failed to store triage result:", insertError);
    }

    return NextResponse.json({
      messageId,
      triage: {
        category: triageResult.label,
        urgency: triageResult.label === "urgent" ? "high" : triageResult.label === "follow_up" ? "medium" : "low",
        summary: triageResult.reason,
        dueDate: triageResult.due_date,
        suggestedActions: [
          triageResult.label === "urgent" ? "Immediate action required" : null,
          triageResult.label === "follow_up" ? "Schedule follow-up" : null,
          "Update communication log",
          triageResult.reply ? "Draft reply available" : null
        ].filter(Boolean),
        reply: triageResult.reply,
        actionsPerformed
      }
    });

  } catch (error: any) {
    console.error("Triage error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to triage message" 
    }, { status: 500 });
  }
}

async function performTriageActions(messageId: string, triageResult: any, originalMessage: any) {
  const actions: string[] = [];
  
  try {
    // 1. Apply categories to the email
    if (triageResult.label) {
      await applyEmailCategory(messageId, triageResult.label);
      actions.push(`Applied category: ${triageResult.label}`);
    }

    // 2. Set importance flag for urgent items
    if (triageResult.label === "urgent") {
      await setEmailImportance(messageId, "high");
      actions.push("Set importance to high");
    }

    // 3. Create draft reply if AI generated one
    if (triageResult.reply?.body) {
      const draftId = await createDraftReply(messageId, triageResult.reply, originalMessage);
      if (draftId) {
        actions.push(`Created draft reply (ID: ${draftId})`);
      }
    }

    // 4. Set follow-up flag for follow_up items
    if (triageResult.label === "follow_up" && triageResult.due_date) {
      await setFollowUpFlag(messageId, triageResult.due_date);
      actions.push(`Set follow-up flag for ${triageResult.due_date}`);
    }

    // 5. Move archive_candidate emails to archive folder
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

async function createDraftReply(messageId: string, replyData: any, originalMessage: any) {
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

    // Update the draft with AI-generated content
    const subject = replyData.subject_prefix 
      ? `${replyData.subject_prefix} ${originalMessage.subject || 'Re: Email'}`
      : `Re: ${originalMessage.subject || 'Email'}`;

    const updateResponse = await makeGraphRequest(`/me/messages/${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        subject: subject,
        body: {
          contentType: "HTML",
          content: `<div>${replyData.body}</div>`
        }
      })
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update draft content: ${updateResponse.status}`);
    }

    return draftId;
  } catch (error) {
    console.error("Error creating draft reply:", error);
    throw error;
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
