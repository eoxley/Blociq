import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: NextRequest) {
  const body = await req.json()

  const messages = [
    {
      role: "system",
      content:
        "You are a UK-based property manager writing leaseholder, contractor, or client emails. Your responses must be legally accurate, reference relevant lease terms and legislation, and use a professional and appropriate tone based on context. Never make assumptions without source data."
    },
    {
      role: "user",
      content: JSON.stringify(body)
    }
  ]

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages,
      temperature: 0.6
    })

    const reply = completion.choices[0]?.message?.content || ""
    return NextResponse.json({ reply })
  } catch (error: any) {
    console.error("GPT Draft Error:", error)
    return NextResponse.json({ error: "Email draft generation failed" }, { status: 500 })
  }
}
