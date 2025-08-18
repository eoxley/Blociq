"use client";

import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

type Uploaded = { file: File; storagePath?: string; uploaded?: boolean; };

export default function BatchUpload({ buildingId }: { buildingId: string }) {
  const { toast } = useToast();
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [analysed, setAnalysed] = useState<any[]|null>(null);
  const [loading, setLoading] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles.map(f => ({ file: f }))]);
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

  async function uploadAll() {
    setLoading(true);
    try {
      // Upload to /api/upload or directly via supabase-js client if you already have it on client
      // Here we assume you have an API route /api/upload that returns storagePath
      const results: Uploaded[] = [];
      for (const f of files) {
        const body = new FormData();
        body.append("file", f.file);
        body.append("buildingId", buildingId);
        const res = await fetch("/api/upload/building-document", { method: "POST", body });
        if (!res.ok) throw new Error("Upload failed");
        const { storagePath } = await res.json();
        results.push({ file: f.file, uploaded: true, storagePath });
      }
      setFiles(results);
      toast({ title: "Uploaded", description: `${results.length} file(s) uploaded.` });
    } catch (e:any) {
      toast({ title: "Upload error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function analyse() {
    setLoading(true);
    try {
      const payload = {
        buildingId,
        files: files.filter(f => f.uploaded && f.storagePath).map(f => ({
          storagePath: f.storagePath!,
          filename: f.file.name,
          mime: f.file.type
        }))
      };
      const r = await fetch("/api/compliance/analyse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error((await r.json()).error || "Analyse failed");
      const data = await r.json();
      setAnalysed(data.files);
    } catch (e:any) {
      toast({ title: "Analyse error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function commitSelection() {
    if (!analysed?.length) return;
    setLoading(true);
    try {
      const payload = { buildingId, rows: analysed };
      const r = await fetch("/api/compliance/commit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error((await r.json()).error || "Commit failed");
      const data = await r.json();
      toast({ title: "Filed", description: `Saved ${data.upserts.length} document(s) and tracking.` });
      setAnalysed(null);
      setFiles([]);
    } catch (e:any) {
      toast({ title: "Commit error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 space-y-4">
        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer ${isDragActive ? "bg-gray-50" : ""}`}>
          <input {...getInputProps()} />
          <div className="text-sm">Drop multiple PDFs/DOCs here or click to select</div>
          <div className="text-xs text-gray-500 mt-1">AI will summarise, classify, and set tracking</div>
        </div>

        {files.length > 0 && (
          <div className="text-sm">{files.length} file(s) selected</div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" onClick={uploadAll} disabled={loading || files.length===0}>Upload</Button>
          <Button onClick={analyse} disabled={loading || !files.some(f=>f.uploaded)}>Analyse</Button>
          <Button onClick={commitSelection} disabled={loading || !analysed?.length}>Accept & File</Button>
        </div>

        {analysed && analysed.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">File</th>
                  <th className="p-2">Doc type</th>
                  <th className="p-2">Asset</th>
                  <th className="p-2">Last date</th>
                  <th className="p-2">Next due</th>
                  <th className="p-2">Frequency</th>
                  <th className="p-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {analysed.map((r:any, i:number)=>(
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.filename}</td>
                    <td className="p-2">{r.doc_type}</td>
                    <td className="p-2">{r.asset_title}{r.matched_asset_id ? "" : " (review)"}</td>
                    <td className="p-2">{r.last_completed_date || "-"}</td>
                    <td className="p-2">{r.next_due_date || "-"}</td>
                    <td className="p-2">{r.frequency_months ? `${r.frequency_months} mo` : "-"}</td>
                    <td className="p-2">{Math.round((r.confidence||0)*100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
