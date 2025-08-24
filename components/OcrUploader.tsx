'use client';
import React, { useState, useEffect } from 'react';

export default function OcrUploader() {
  const [docId, setDocId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = (e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement)?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload-document', { method: 'POST', body: fd });
    const json = await res.json();
    setDocId(json.document_id);
    setStatus(json.status);
  }

  useEffect(() => {
    if (!docId) return;
    const t = setInterval(async () => {
      const r = await fetch(`/api/documents/${docId}/status`);
      const j = await r.json();
      if (j.status) setStatus(j.status);
    }, 2000);
    return () => clearInterval(t);
  }, [docId]);

  return (
    <form onSubmit={onUpload}>
      <input type="file" accept="application/pdf" />
      <button type="submit">Upload & OCR</button>
      {docId && <p>Status: {status}</p>}
    </form>
  );
}
