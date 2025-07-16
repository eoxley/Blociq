"use client"

import React, { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { toast } from "sonner"
import DocumentTypeSelector from "./DocumentTypeSelector"

const TEST_BUILDING_ID = 3

export default function UploadClean() {
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [showTypeSelector, setShowTypeSelector] = useState(false)
  const [currentDocumentId, setCurrentDocumentId] = useState<string>("")

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
    const documentId = crypto.randomUUID()

    const { error: insertError } = await supabase.from("compliance_docs").insert([
      {
        id: documentId,
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
      toast.error("Metadata save failed. Check console.")
    } else {
      console.log("✅ File uploaded and metadata saved.")
      
      // Now trigger AI analysis
      try {
        console.log("🤖 Starting AI document analysis...")
        toast.info("Analyzing document with AI...")
        
        const res = await fetch('/api/extract-summary', {
          method: 'POST',
          body: JSON.stringify({ documentId }),
          headers: { 'Content-Type': 'application/json' }
        });

        if (res.ok) {
          const { summary, doc_type, issue_date, expiry_date, key_risks, compliance_status } = await res.json();
          console.log("✅ AI Analysis complete:", { summary, doc_type, issue_date, expiry_date, key_risks, compliance_status });
          
          // Check if AI couldn't detect the document type
          if (!doc_type || doc_type === 'Unknown' || doc_type === 'null') {
            console.log("⚠️ AI couldn't detect document type, showing manual selector");
            setCurrentDocumentId(documentId);
            setShowTypeSelector(true);
            setUploading(false);
            setFile(null);
            return; // Don't update the database yet, wait for user selection
          }
          
          // Update the document with AI-extracted information
          const updateData: any = {};
          if (doc_type && doc_type !== 'Unknown') updateData.doc_type = doc_type;
          if (issue_date && issue_date !== 'Not found') updateData.start_date = issue_date;
          if (expiry_date && expiry_date !== 'Not found') updateData.expiry_date = expiry_date;
          
          if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
              .from('compliance_docs')
              .update(updateData)
              .eq('id', documentId);
              
            if (updateError) {
              console.error("⚠️ Failed to update with AI data:", updateError);
              toast.warning("Upload successful, but failed to update with AI data");
            } else {
              console.log("✅ Document updated with AI-extracted data");
              toast.success(`Upload successful! Document analyzed as: ${doc_type}`);
            }
          } else {
            toast.success("Upload successful! AI analysis complete.");
          }
        } else {
          const errorData = await res.json();
          console.error("❌ AI analysis failed:", errorData);
          toast.warning("Upload successful, but AI analysis failed");
        }
      } catch (aiError) {
        console.error("❌ AI analysis error:", aiError);
        toast.error("Upload successful, but AI analysis failed");
      }
    }

    setUploading(false)
    setFile(null)
  }

  const handleTypeSelected = (docType: string) => {
    console.log("✅ User selected document type:", docType);
    toast.success(`Document type updated to ${docType}`);
    setShowTypeSelector(false);
  };

  const handleReanalyze = async () => {
    if (!currentDocumentId) return;
    
    try {
      toast.info("Re-analyzing document with AI...");
      
      const res = await fetch('/api/extract-summary', {
        method: 'POST',
        body: JSON.stringify({ documentId: currentDocumentId }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const analysisResult = await res.json();
        
        if (analysisResult.doc_type && analysisResult.doc_type !== 'Unknown' && analysisResult.doc_type !== 'null') {
          // AI found a type, update the database
          const { error: updateError } = await supabase
            .from('compliance_docs')
            .update({ doc_type: analysisResult.doc_type })
            .eq('id', currentDocumentId);
            
          if (!updateError) {
            toast.success(`AI re-analysis successful! Type: ${analysisResult.doc_type}`);
            setShowTypeSelector(false);
          }
        } else {
          // AI still couldn't detect, show selector again
          setShowTypeSelector(true);
        }
      } else {
        toast.error("Re-analysis failed");
      }
    } catch (error) {
      console.error("Re-analysis error:", error);
      toast.error("Re-analysis failed");
    }
  };

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

      {/* Document Type Selector Modal */}
      <DocumentTypeSelector
        isOpen={showTypeSelector}
        onClose={() => setShowTypeSelector(false)}
        documentId={currentDocumentId}
        onTypeSelected={handleTypeSelected}
        onReanalyze={handleReanalyze}
      />
    </div>
  )
}
