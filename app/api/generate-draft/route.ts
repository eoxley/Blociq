import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat"; // ✅ Import the correct type

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: NextRequest) {
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
