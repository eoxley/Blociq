// File: /components/property-inbox.tsx

"use client"

import { useEmailSync } from "@/hooks/useEmailSync"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function PropertyInbox() {
  const [emails, newCount] = useEmailSync()

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inbox</h1>
        {newCount > 0 && (
          <span className="text-sm text-primary font-medium">
            🔔 {newCount} new email{newCount > 1 ? "s" : ""} since last sync
          </span>
        )}
      </div>

      <div className="space-y-4">
        {emails.length === 0 && (
          <p className="text-muted-foreground text-sm">No emails found.</p>
        )}

        {emails.map((email) => (
          <div
            key={email.message_id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-lg font-semibold">
                  {email.subject || "(No subject)"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  From: {email.from_email} • Received: {new Date(email.received_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {email.isUnread && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Unread
                  </span>
                )}
                {email.flag && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    {email.flag}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {email.body_preview || "(No preview available)"}
            </p>

            <Link
              href={`/ai-reply?from=${encodeURIComponent(email.from_email)}&subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body_preview || "")}`}
            >
              <Button size="sm" className="rounded-lg">
                Reply with AI
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
