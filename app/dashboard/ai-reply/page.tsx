"use client"

import { useSearchParams } from "next/navigation"
import EmailDraftAssistant from "@/components/ui/EmailDraftAssistant"

export default function AiReplyPage() {
  const searchParams = useSearchParams()

  const subject = searchParams.get("subject") || ""
  const from = searchParams.get("from") || ""
  const body = searchParams.get("body") || ""

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">✉️ Generate AI Reply</h1>
      <p className="text-muted-foreground mb-4">
        Replying to: <strong>{from}</strong><br />
        Subject: <strong>{subject}</strong>
      </p>
      <EmailDraftAssistant
        defaultBuilding=""
        defaultUnit=""
        defaultIssue={body}
        defaultFrom={from}
        defaultSubject={subject}
      />
    </div>
  )
}
