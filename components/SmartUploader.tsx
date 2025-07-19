"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { v4 as uuidv4 } from "uuid";

type Props = {
  table: "leases" | "compliance_docs";
  docTypePreset?: string;
  buildingId?: number;
  unitId?: number;
  uploadedBy?: string;
  onSaveSuccess?: (saved: Record<string, unknown>) => void;
};

const SmartUploader: React.FC<Props> = ({
  table,
  docTypePreset,
  buildingId,
  unitId,
  uploadedBy,
  onSaveSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [saved, setSaved] = useState(false);

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);

    try {
      // Upload to Supabase
      const fileExt = file.name.split(".").pop();
      const filePath = `${table}/${uuidv4()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw new Error(`Upload error: ${uploadError.message}`);

      const publicUrl = supabase.storage
        .from("documents")
        .getPublicUrl(filePath).data.publicUrl;

      // Try extract-pdf first
      let text = "";
      const extractRes = await fetch("/api/extract-pdf", {
        method: "POST",
        body: JSON.stringify({ fileUrl: publicUrl }),
        headers: { "Content-Type": "application/json" },
      });

      if (!extractRes.ok) {
        const html = await extractRes.text();
        throw new Error(`PDF extract failed: ${html.slice(0, 200)}`);
      }

      const extractData = await extractRes.json();
      text = extractData.text || "";

      // If no text, offer OCR fallback
      if (!text || text.trim().length < 20) {
        const useOCR = confirm("No text found. Try OCR instead?");
        if (useOCR) {
          const ocrRes = await fetch("/api/ocr", {
            method: "POST",
            body: JSON.stringify({ fileUrl: publicUrl }),
            headers: { "Content-Type": "application/json" },
          });

          if (!ocrRes.ok) {
            const html = await ocrRes.text();
            throw new Error(`OCR failed: ${html.slice(0, 200)}`);
          }

          const ocrData = await ocrRes.json();
          text = ocrData.text || "";
        }
      }

      if (!text || text.trim().length < 20) {
        throw new Error("Still no usable text found in document.");
      }

      // Send to GPT
      const gptRes = await fetch("/api/extract", {
        method: "POST",
        body: JSON.stringify({ text }),
        headers: { "Content-Type": "application/json" },
      });

      if (!gptRes.ok) {
        const html = await gptRes.text();
        throw new Error(`GPT extract failed: ${html.slice(0, 200)}`);
      }

      const extracted = await gptRes.json();
      console.log("🧠 Full AI Extracted Lease Data:", extracted);

      setMetadata({
        doc_type: docTypePreset || extracted.doc_type || "",
        building_name: extracted.building_name || "",
        start_date: extracted.lease_start_date || "",
        expiry_date: extracted.lease_end_date || "",
        reminder_days: 30,
        doc_url: publicUrl,
      });
    } catch (error: unknown) {
      console.error("❌ Extraction error:", error.message);
      alert(`Extraction error: ${error.message}`);
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!metadata) return;
    setLoading(true);

    const insertPayload = {
      doc_type: metadata.doc_type,
      start_date: metadata.start_date || null,
      expiry_date: metadata.expiry_date || null,
      reminder_days: metadata.reminder_days || null,
      doc_url: metadata.doc_url,
      uploaded_by: uploadedBy || null,
      building_id: buildingId || null,
      unit_id: unitId || null,
      is_headlease: unitId ? false : true,
    };

    const { data, error } = await supabase.from(table).insert([insertPayload]).select();

    if (error) {
      console.error("❌ Save error:", error.message);
    } else {
      setSaved(true);
      onSaveSuccess?.(data[0]);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Upload PDF</Label>
        <Input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0] || null;
            setFile(selectedFile);
            setSaved(false);
            setMetadata(null);
          }}
        />
      </div>

      {file && !metadata && (
        <Button onClick={handleExtract} disabled={loading}>
          {loading ? "Extracting..." : "Extract Metadata"}
        </Button>
      )}

      {metadata && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-gray-50">
          <div>
            <Label>Document Type</Label>
            <Input
              value={metadata.doc_type}
              onChange={(e) => setMetadata({ ...metadata, doc_type: e.target.value })}
            />
          </div>
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={metadata.start_date}
              onChange={(e) => setMetadata({ ...metadata, start_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Expiry Date</Label>
            <Input
              type="date"
              value={metadata.expiry_date}
              onChange={(e) => setMetadata({ ...metadata, expiry_date: e.target.value })}
            />
          </div>
          <div>
            <Label>Reminder Days</Label>
            <Input
              type="number"
              value={metadata.reminder_days}
              onChange={(e) =>
                setMetadata({ ...metadata, reminder_days: parseInt(e.target.value) })
              }
            />
          </div>
        </div>
      )}

      {metadata && (
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save to Supabase"}
        </Button>
      )}

      {saved && <p className="text-green-600 text-sm">✅ Document saved successfully.</p>}
    </div>
  );
};

export default SmartUploader;
