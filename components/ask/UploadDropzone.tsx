'use client';
import React, { useRef, useState } from 'react';

export function UploadDropzone({ onResult, defaultBuildingId = null }: { onResult: (d:any)=>void, defaultBuildingId?: string|null }) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    if (file.size > 15 * 1024 * 1024) { setErr('File too large (>15MB)'); return; }
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.set('file', file);
      if (defaultBuildingId) fd.set('building_id', defaultBuildingId);
      const res = await fetch('/api/ask-ai/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Upload failed');
      onResult(json);
    } catch (e:any) {
      setErr(e.message || 'Upload failed');
    } finally { setBusy(false); }
  };

  return (
    <div className={`border-2 border-dashed rounded-2xl p-6 text-center ${dragging ? 'bg-gray-50' : ''}`}>
      <input ref={inputRef} type="file" className="hidden" onChange={e => onFiles(e.target.files)} />
      <div
        onDragOver={(e)=>{e.preventDefault(); setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        onDrop={(e)=>{ e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
      >
        <p className="mb-3 font-medium">Drag & drop a document here</p>
        <p className="text-sm text-gray-500 mb-4">or</p>
        <button onClick={()=>inputRef.current?.click()} className="px-4 py-2 rounded-xl shadow">Choose file</button>
        {busy && <p className="mt-3 text-sm">Uploading…</p>}
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      </div>
    </div>
  );
}
