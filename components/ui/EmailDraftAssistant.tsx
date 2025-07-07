"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

interface Props {
  defaultBuilding?: string
  defaultUnit?: string
  defaultIssue?: string
  defaultFrom?: string
  defaultSubject?: string
}

export default function EmailDraftAssistant(props: Props) {
  const [building, setBuilding] = useState(props.defaultBuilding || "")
  const [unit, setUnit] = useState(props.defaultUnit || "")
  const [issue, setIssue] = useState(props.defaultIssue || "")
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [latestReply, setLatestReply] = useState("")

  useEffect(() => {
    async function fetchPreviousReply() {
      if (!props.defaultSubject) return

      const { data, error } = await supabase
        .from("email_drafts")
        .select("draft")
        .eq("subject", props.defaultSubject)
        .order("created_at", { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        setLatestReply(data[0].draft)
      }
    }
    fetchPreviousReply()
  }, [props.defaultSubject])

  async function handleGenerate() {
    setLoading(true)

    const { data: leaseData } = await supabase
      .from("leases")
      .select("*")
      .eq("unit", unit)
      .single()

    const { data: files } = await supabase
      .from("compliance_docs")
      .select("*")
      .eq("building_id", building)

    const payload = {
      context: {
        building_name: building,
        unit: unit,
        leaseholder_name: leaseData?.leaseholder_name || "Leaseholder",
        property_manager: "Ellie Oxley",
        email_thread: {
          original_sender: props.defaultFrom || "Unknown",
          subject: props.defaultSubject || "No subject",
          body: issue
        },
        issue_summary: `This is a reply to an email from ${props.defaultFrom || "the leaseholder"} about \"${props.defaultSubject || "no subject"}\".`,
        previous_reply: latestReply,
        uploaded_documents: files?.map(file => ({
          name: file.doc_type,
          summary: `Attached document uploaded on ${file.created_at}`,
          link: file.doc_url
        })),
        lease_metadata: {
          lease_term: leaseData?.lease_term,
          repair_responsibility: leaseData?.repair_responsibility,
          demised_premises: leaseData?.demised_premises,
          service_charge_apportionment: leaseData?.apportionment,
          subletting_clause: leaseData?.subletting_clause
        },
        relevant_legislation: [
          {
            source: "Landlord and Tenant Act 1985, Section 11",
            summary: "Landlord must keep the structure and exterior in repair, including roof"
          },
          {
            source: "Landlord and Tenant Act 1985, Section 20B",
            summary: "Costs must be demanded within 18 months or may not be recoverable"
          }
        ]
      },
      request: {
        goal: "Write a reply to the leaseholder based on the history and context. Respond to the original email content and acknowledge prior replies if applicable.",
        tone: "Warm and professional",
        sign_off: "Kind regards\nEllie Oxley"
      }
    }

    const response = await fetch("/api/generate-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    setDraft(result.reply || "❌ Error generating draft.")
    setLoading(false)
  }

  return (
    <Card className="p-4 mt-4">
      <CardContent>
        <Label>🏢 Building Name</Label>
        <Input
          placeholder="e.g. Jubilee House"
          value={building}
          onChange={e => setBuilding(e.target.value)}
        />

        <Label className="mt-2">🏠 Unit</Label>
        <Input
          placeholder="e.g. Flat 7"
          value={unit}
          onChange={e => setUnit(e.target.value)}
        />

        <Label className="mt-2">🧵 Email Thread or Summary</Label>
        <Textarea
          placeholder="Paste the thread or describe the issue..."
          value={issue}
          onChange={e => setIssue(e.target.value)}
        />

        <Button onClick={handleGenerate} disabled={loading} className="mt-4">
          {loading ? "Generating..." : "Generate Email with AI"}
        </Button>

        {draft && (
          <div className="mt-6">
            <Label>📬 Draft Email</Label>
            <Textarea
              rows={12}
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />

            <div className="mt-4 flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(draft)
                  alert("Draft copied to clipboard!")
                }}
              >
                Copy Draft
              </Button>

              <Button
                onClick={async () => {
                  const { error } = await supabase.from("email_drafts").insert({
                    draft,
                    subject: props.defaultSubject || "No subject",
                    from_email: props.defaultFrom || "Unknown",
                    unit: unit,
                    building_id: building,
                    created_at: new Date().toISOString()
                  })
                  if (error) {
                    alert("❌ Failed to save draft.")
                    console.error(error)
                  } else {
                    alert("✅ Draft saved to Supabase.")
                  }
                }}
              >
                Save Draft
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
