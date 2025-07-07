"use client"

import React, { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "./ui/button"
import { Input } from "./ui/input"

const TEST_BUILDING_ID = 3

export default function UploadClean() {
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    console.log("🚀 Upload triggered")

    if (!file || !TEST_BUILDING_ID) {
      alert("Please select a file and building.")
      return
    }

    setUploading(true)

    const fileExt = file.name.split(".").pop()
    const filePath = `${TEST_BUILDING_ID}/${Date.now()}-${Math.random()}.${fileExt}`

    console.log("📁 Upload path:", filePath)
    console.log("📄 File to upload:", {
      name: file?.name,
      size: file?.size,
      type: file?.type,
    })

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      })

    if (uploadError) {
      console.error("❌ Upload failed", uploadError)
      alert("Upload failed. Check console for details.")
      setUploading(false)
      return
    }

    const fileUrl = supabase.storage.from("documents").getPublicUrl(filePath).data.publicUrl

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    console.log("🧠 Session data:", sessionData)

    if (sessionError || !sessionData?.session?.user?.id) {
      console.error("❌ No user session or ID found.")
      alert("Authentication error. Please log in.")
      setUploading(false)
      return
    }

    const userId = sessionData.session.user.id
    console.log("📦 Uploading doc with user ID:", userId)

    const metadata = extractMetadataFromFilename(file.name)

    const { error: insertError } = await supabase.from("compliance_docs").insert([
      {
        id: crypto.randomUUID(),
        building_id: TEST_BUILDING_ID,
        doc_url: fileUrl,
        uploaded_by: userId,
        doc_type: metadata.doc_type,
        // Optional fields set to null for now
        start_date: null,
        expiry_date: null,
        reminder_days: null,
        created_at: new Date().toISOString(),
      },
    ])

    if (insertError) {
      console.error("❌ Metadata insert failed:", insertError)
      alert("Metadata save failed. Check console.")
    } else {
      console.log("✅ File uploaded and metadata saved.")
      alert("Upload successful!")
    }

    setUploading(false)
    setFile(null)
  }

  function extractMetadataFromFilename(fileName: string) {
    const name = fileName.toLowerCase()

    const docTypes = [
      "fire risk assessment",
      "asbestos",
      "eicr",
      "gas certificate",
      "h&s",
      "risk assessment",
      "lift service",
      "emergency lighting",
    ]

    let matchedType = docTypes.find((type) =>
      name.includes(type.replace(/\s/g, "-")) || name.includes(type.replace(/\s/g, ""))
    )

    matchedType = matchedType?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

    const dateMatch = name.match(/\d{4}[-_]\d{2}[-_]\d{2}/) || name.match(/\d{4}/)
    const date = dateMatch ? dateMatch[0].replace(/_/g, "-") : null

    return {
      doc_type: matchedType ?? "Unknown",
      doc_date: date ?? null,
    }
  }

  return (
    <div className="space-y-4">
      <Input type="file" onChange={handleFileChange} />
      <Button onClick={handleUpload} disabled={uploading}>
        {uploading ? "Uploading..." : "Upload File"}
      </Button>
    </div>
  )
}
