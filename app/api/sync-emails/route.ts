// File: /app/api/sync-emails/route.ts

import { NextRequest, NextResponse } from "next/server"
import { getAccessToken } from "@/lib/outlookAuth"
import { Client } from "@microsoft/microsoft-graph-client"
import { createClient } from "@supabase/supabase-js"
import "isomorphic-fetch"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const accessToken = await getAccessToken()
    const client = Client.init({
      authProvider: (done) => done(null, accessToken)
    })

    const previewOnly = req.nextUrl.searchParams.get("preview") === "true"

    const messages = await client
      .api("/users/eleanor.oxley@blociq.co.uk/messages")
      .top(10)
      .select("subject,from,bodyPreview,internetMessageId,conversationId,receivedDateTime")
      .orderby("receivedDateTime DESC")
      .get()

    const parsed = messages.value.map((msg: Record<string, unknown>) => ({
      thread_id: msg.conversationId,
      message_id: msg.internetMessageId,
      from_email: (msg.from as { emailAddress?: { address: string } })?.emailAddress?.address,
      subject: msg.subject,
      body_preview: msg.bodyPreview,
      received_at: msg.receivedDateTime
    }))

    const results = []

    for (const email of parsed) {
      // Match leaseholder email to unit
      const { data: unitMatch } = await supabase
        .from("units")
        .select("unit_number, building_id")
        .eq("leaseholder_email", email.from_email)
        .single()

      if (unitMatch) {
        email.unit = unitMatch.unit_number
        email.building_id = unitMatch.building_id
        console.log(`Matched: ${email.from_email} → ${email.unit}, building ${email.building_id}`)
      } else {
        // Fallback: match "Flat 7" in subject
        const match = email.subject?.match(/flat\s?(\d+[A-Za-z]?)/i)
        if (match) {
          const flat = `Flat ${match[1]}`
          const { data: fallbackUnit } = await supabase
            .from("units")
            .select("unit_number, building_id")
            .eq("unit_number", flat)
            .single()

          if (fallbackUnit) {
            email.unit = fallbackUnit.unit_number
            email.building_id = fallbackUnit.building_id
            console.log(`Fallback matched subject to unit: ${email.unit}`)
          }
        }
      }

      if (!previewOnly) {
        const { error } = await supabase.from("incoming_emails").insert(email)
        results.push({ email, status: error ? "error" : "inserted", error })
        
        // Trigger AI analysis for newly inserted emails
        if (!error) {
          try {
            console.log(`🧠 Triggering AI analysis for email: ${email.message_id}`)
            // Trigger AI analysis asynchronously
            fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analyze-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messageId: email.message_id })
            }).catch(err => {
              console.warn('Failed to trigger AI analysis:', err)
            })
          } catch (analysisError) {
            console.warn('Failed to trigger AI analysis:', analysisError)
          }
        }
      } else {
        results.push({ email, status: "preview" })
      }
    }

    return NextResponse.json({ success: true, count: results.length, previewOnly, results })
  } catch (error) {
    console.error("Email sync failed:", error)
    return NextResponse.json({ error: "Failed to sync emails" }, { status: 500 })
  }
}