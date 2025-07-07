import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // ✅ Dynamically import OpenAI only at runtime
  const OpenAI = (await import("openai")).default;

  // ✅ Check that the API key is available
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY environment variable is missing." },
      { status: 500 }
    );
  }

  const openai = new OpenAI({ apiKey });

  // 🔽 Example payload: adjust based on how you're using this route
  const { prompt } = await req.json();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    return NextResponse.json({
      result: completion.choices?.[0]?.message?.content ?? "(No response)",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "OpenAI request failed", details: error.message },
      { status: 500 }
    );
  }
}
