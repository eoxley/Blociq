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
