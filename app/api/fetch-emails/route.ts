import { NextRequest, NextResponse } from "next/server"
import { getAccessToken } from "@/lib/outlookAuth"
import { Client } from "@microsoft/microsoft-graph-client"
import "isomorphic-fetch"

export async function GET(req: NextRequest) {
  try {
    const accessToken = await getAccessToken()

    const client = Client.init({
      authProvider: (done) => done(null, accessToken)
    })

    const messages = await client
      .api("/users/eleanor.oxley@blociq.co.uk/messages")
      .top(10)
      .select("subject,from,bodyPreview,internetMessageId,conversationId,receivedDateTime")
      .orderby("receivedDateTime DESC")
      .get()

    const parsedEmails = messages.value.map((msg: any) => ({
      thread_id: msg.conversationId,
      message_id: msg.internetMessageId,
      from_email: msg.from?.emailAddress?.address,
      subject: msg.subject,
      body_preview: msg.bodyPreview,
      received_at: msg.receivedDateTime
    }))

    return NextResponse.json({ emails: parsedEmails })
  } catch (error) {
    console.error("Outlook fetch failed:", error)
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
  }
}
