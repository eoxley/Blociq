"use client";
import React, { useRef, useState } from "react";
import { Paperclip, Upload, X, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertSuccess, AlertError, AlertWarning } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// TODO: Replace with actual compliance doc types from your system
const DOC_TYPES = [
  "EICR",
  "FRA",
  "Buildings Insurance",
  "Lift Inspection",
  "Asbestos Survey",
  "Legionella Risk Assessment",
  "Other",
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function GlobalDocumentUploader() {
  const supabase = createClientComponentClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [buildingId, setBuildingId] = useState<string>("");
  const [docType, setDocType] = useState<string>("");
  const [docTypeOverride, setDocTypeOverride] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "uploading" | "summarising" | "success" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [aiUncertain, setAiUncertain] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TODO: Fetch buildings for dropdown
  const buildings = [
    { id: "1", name: "Sample Court" },
    { id: "2", name: "Maple House" },
    // ...
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type === "application/pdf") {
      setFile(f);
      setError("");
    } else {
      setError("Please select a PDF file.");
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type === "application/pdf") {
      setFile(f);
      setError("");
    } else {
      setError("Please select a PDF file.");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setError("");
    setSummary("");
    setDocType("");
    setAiUncertain(false);
    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const filePath = `compliance/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { contentType: "application/pdf" });
      if (uploadError) throw new Error(uploadError.message);
      const fileUrl = uploadData?.path;

      // 2. Create record in compliance_docs
      const { data: docRecord, error: docError } = await supabase
        .from("compliance_docs")
        .insert([
          {
            building_id: buildingId || null,
            doc_type: null, // will update after AI
            file_url: fileUrl,
            summary: null, // will update after AI
          },
        ])
        .select()
        .single();
      if (docError) throw new Error(docError.message);
      const docId = docRecord.id;

      setStatus("summarising");
      // 3. Call /api/extract-summary
      const res = await fetch("/api/extract-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId }),
      });
      if (!res.ok) throw new Error("AI summarisation failed");
      const { summary: aiSummary, doc_type: aiDocType, uncertain } = await res.json();
      setSummary(aiSummary);
      setDocType(aiDocType);
      setAiUncertain(!!uncertain || !aiDocType);

      // 4. Allow override if AI is unsure
      // 5. Save summary and doc_type to compliance_docs
      const { error: updateError } = await supabase
        .from("compliance_docs")
        .update({
          summary: aiSummary,
          doc_type: aiDocType,
        })
        .eq("id", docId);
      if (updateError) throw new Error(updateError.message);
      setStatus("success");
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setStatus("error");
    }
  };

  const handleOverride = async () => {
    if (!docTypeOverride) return;
    setStatus("uploading");
    try {
      // Update doc_type in compliance_docs
      // (Assume last uploaded doc is the one to update)
      const { error: updateError } = await supabase
        .from("compliance_docs")
        .update({ doc_type: docTypeOverride })
        .order("created_at", { ascending: false })
        .limit(1);
      if (updateError) throw new Error(updateError.message);
      setDocType(docTypeOverride);
      setStatus("success");
      setAiUncertain(false);
    } catch (err: any) {
      setError(err.message || "Override failed");
      setStatus("error");
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        className="fixed bottom-6 right-6 bg-primary text-white p-4 rounded-full shadow-2xl z-50 hover:bg-primary/90 hover:scale-110 transition-all duration-200 border-2 border-white"
        onClick={() => setOpen(true)}
        aria-label="Upload Document"
      >
        <Paperclip className="h-7 w-7" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-4 text-foreground">Upload Compliance Document</h2>
            <div
              className={classNames(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer mb-4",
                file ? "border-success bg-success/10" : "border-slate-300 bg-slate-50"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-success" />
                  <span className="text-success font-medium">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-slate-500">Drag & drop a PDF here, or click to select</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {/* Building Selector */}
            <div className="mb-4">
              <Label htmlFor="building-select">Building</Label>
              <Select
                id="building-select"
                value={buildingId}
                onChange={e => setBuildingId(e.target.value)}
              >
                <option value="">Select building...</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </div>
            {/* Upload Button */}
            <Button
              className="w-full mb-2"
              onClick={handleUpload}
              disabled={!file || !buildingId || status === "uploading" || status === "summarising"}
            >
              {status === "uploading" || status === "summarising" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {status === "uploading"
                ? "Uploading..."
                : status === "summarising"
                ? "Analysing..."
                : "Upload & Analyse"}
            </Button>
            {error && <AlertError className="mt-2">{error}</AlertError>}
            {/* Summary Preview */}
            {status === "success" && (
              <div className="mt-4">
                <AlertSuccess>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span>Document uploaded and analysed!</span>
                  </div>
                </AlertSuccess>
                <div className="mt-2">
                  <Badge variant="info">Detected type: {docType || "Unknown"}</Badge>
                  <div className="mt-2 bg-slate-50 border border-slate-200 rounded p-2 text-sm text-slate-700">
                    <strong>Summary:</strong>
                    <div className="whitespace-pre-line">{summary}</div>
                  </div>
                </div>
              </div>
            )}
            {/* Doc Type Override if AI is unsure */}
            {aiUncertain && (
              <div className="mt-4">
                <AlertWarning>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <span>AI could not confidently detect the document type. Please select:</span>
                  </div>
                </AlertWarning>
                <Select
                  value={docTypeOverride}
                  onChange={e => setDocTypeOverride(e.target.value)}
                  className="mt-2"
                >
                  <option value="">Select document type...</option>
                  {DOC_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
                <Button
                  className="mt-2"
                  onClick={handleOverride}
                  disabled={!docTypeOverride || status === "uploading"}
                >
                  Save Document Type
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
} 