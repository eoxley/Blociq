import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const OpenAI = (await import("openai")).default;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY environment variable is missing." },
      { status: 500 }
    );
  }

  const openai = new OpenAI({ apiKey });

  try {
    const { prompt } = await req.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    return NextResponse.json({
      result: completion.choices?.[0]?.message?.content ?? "(No response)",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to generate draft",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
