"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

interface Email {
  message_id: string
  subject: string
  from_email: string
  received_at: string
  flag?: string
  read_at?: string | null
  unit?: string
  building_id?: number
  body_preview?: string
}

export function useEmailSync(intervalMs = 60000) {
  const [emails, setEmails] = useState<Email[]>([])
  const [newCount, setNewCount] = useState(0)
  const latestMessageId = useRef<string | null>(null)
  const lastSyncTime = useRef<Date | null>(null)

  useEffect(() => {
    async function syncEmails() {
      try {
        const res = await fetch("/api/sync-emails?preview=true")
        const data = await res.json()

        if (data.success && Array.isArray(data.results)) {
          const newEmails = data.results.map((r: any) => {
            const email = r.email as Email

            // Auto-tag
            if (!email.flag) {
              if (/leak|fire|emergency/i.test(email.subject)) email.flag = "🔥 Urgent"
              else if (/insurance|invoice|quote/i.test(email.subject)) email.flag = "💰 Finance"
              else if (/complaint|unhappy|frustrated/i.test(email.subject)) email.flag = "⚠️ Complaint"
            }

            return email
          })

          const now = new Date()
          const recent = newEmails.filter(e => {
            const received = new Date(e.received_at)
            return lastSyncTime.current && received > lastSyncTime.current
          })

          setNewCount(recent.length)
          lastSyncTime.current = now
          setEmails(newEmails)

          if (latestMessageId.current && newEmails.length > 0) {
            const latestFetched = newEmails[0].message_id
            if (latestFetched !== latestMessageId.current) {
              const { subject, from_email } = newEmails[0]
              toast({
                title: `📩 New email from ${from_email}`,
                description: `Subject: ${subject || "(no subject)"}`
              })
            }
          }

          if (newEmails.length > 0) {
            latestMessageId.current = newEmails[0].message_id
          }
        }
      } catch (err) {
        console.error("Email sync failed:", err)
      }
    }

    syncEmails()
    const interval = setInterval(syncEmails, intervalMs)
    return () => clearInterval(interval)
  }, [intervalMs])

  return [emails.map(e => ({ ...e, isUnread: !e.read_at })), newCount] as const
}
