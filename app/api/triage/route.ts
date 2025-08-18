import { NextResponse } from "next/server";
import { classifyEmailForTriage } from "@/lib/ai/triage";
import { getAccessTokenForUser } from "@/lib/outlook/graph";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { messageId, userId } = await req.json();
    
    if (!messageId) {
      return NextResponse.json({ error: "messageId required" }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Get access token for the user
    const token = await getAccessTokenForUser(userId);
    
    // Get the specific message from Outlook
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${messageId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch message: ${response.statusText}`);
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
        reply: triageResult.reply
      }
    });

  } catch (error: any) {
    console.error("Triage error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to triage message" 
    }, { status: 500 });
  }
}
