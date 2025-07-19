import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      emailId, 
      buildingId, 
      history = [], 
      senderName, 
      emailBody,
      tone = "Professional" 
    } = body;

    if (!emailId || !emailBody) {
      return NextResponse.json({ 
        error: "Email ID and body are required" 
      }, { status: 400 });
    }

    // Fetch building context if buildingId provided
    let buildingContext = "";
    if (buildingId) {
      const { data: building } = await supabase
        .from("buildings")
        .select("name, address, total_units")
        .eq("id", buildingId)
        .single();

      if (building) {
        buildingContext = `
Building: ${building.name}
Address: ${building.address}
Total Units: ${building.total_units}
        `.trim();
      }
    }

    // Fetch email thread history if available
    let threadHistory = "";
    if (history.length > 0) {
      threadHistory = `
Previous messages in this thread:
${history.map((msg: Record<string, unknown>, index: number) => 
  `${index + 1}. ${msg.sender}: ${msg.body}`
).join('\n')}
      `.trim();
    }

    // Build the AI prompt
    const systemPrompt = `You are Ellie Oxley, a professional UK block manager at BlocIQ. You draft clear, helpful, and leaseholder-focused email replies.

Key principles:
- Always be polite and professional
- Address the leaseholder's concerns directly
- Provide clear next steps when possible
- Use appropriate UK property management terminology
- Keep responses concise but comprehensive
- Sign off as "Ellie Oxley, BlocIQ"

Tone: ${tone}`;

    const userPrompt = `
Email received from: ${senderName || "Leaseholder"}
Original message:
"${emailBody}"

${buildingContext ? `Building Context:\n${buildingContext}\n` : ""}
${threadHistory ? `Email Thread History:\n${threadHistory}\n` : ""}

Please draft a professional reply that:
1. Acknowledges their message
2. Addresses their specific concern or question
3. Provides relevant information or next steps
4. Maintains a ${tone.toLowerCase()} tone
5. Signs off appropriately

Reply:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const aiDraft = completion.choices[0].message.content;

    return NextResponse.json({ 
      success: true, 
      draft: aiDraft,
      buildingContext: buildingContext || null
    });

  } catch (error) {
    console.error("Error generating reply:", error);
    return NextResponse.json(
      { error: "Failed to generate AI reply" },
      { status: 500 }
    );
  }
} 