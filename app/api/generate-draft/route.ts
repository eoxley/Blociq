import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat"; // ✅ Import the correct type

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("OPENAI_API_KEY environment variable is not set");
}

const openai = apiKey ? new OpenAI({ apiKey }) : null;

export async function POST(req: NextRequest) {
  if (!openai) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const prompt: string = body.prompt;

    // ✅ Type the messages correctly for OpenAI
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are a helpful assistant for property managers."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      temperature: 0.6
    });

    const responseText = completion.choices[0].message.content;
    return NextResponse.json({ text: responseText });
  } catch (error) {
    console.error("Error generating draft:", error);
    return NextResponse.json(
      { error: "Failed to generate draft from AI." },
      { status: 500 }
    );
  }
}
