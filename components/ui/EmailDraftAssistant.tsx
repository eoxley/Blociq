"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabaseClient"

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
        property_manager: "Property Manager",
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
        sign_off: "Kind regards\nProperty Manager"
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
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 mt-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-purple-500 rounded-lg">
          <span className="text-white text-lg">✉️</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Email Draft Assistant</h3>
          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">Coming Soon</span>
        </div>
      </div>
      
      <div className="text-gray-600 text-sm mb-4">
        <p className="mb-2">🎯 <strong>What's coming:</strong></p>
        <ul className="space-y-1 text-sm">
          <li>• AI-powered email drafting with lease context</li>
          <li>• Automatic legal compliance checking</li>
          <li>• Template library and customization</li>
          <li>• Integration with email systems</li>
        </ul>
      </div>
      
      <div className="bg-white rounded-lg p-6 border border-purple-200">
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🚧</div>
          <h4 className="font-medium text-gray-900 mb-2">AI Email Assistant</h4>
          <p className="text-gray-600 text-sm mb-4">
            Generate professional, legally compliant emails using AI that understands your lease terms and building context.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-1">🏢</div>
              <p className="text-gray-600">Building Context</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">📋</div>
              <p className="text-gray-600">Lease Integration</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">⚖️</div>
              <p className="text-gray-600">Legal Compliance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
