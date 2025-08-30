'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function OcrUploadSimple() {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string>('');
  const [usedOCR, setUsedOCR] = useState<boolean>(false);
  const [textLength, setTextLength] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(null);
    setLoading(true);
    setText('');
    setFileName(f.name);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/ask-ai/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'OCR failed');
      }
      setText(data.text || '');
      setTextLength(data.textLength ?? (data.text?.length ?? 0));
      setUsedOCR(!!data.usedOCR);
    } catch (e: any) {
      setErr(e.message || 'Upload failed');
    } finally {
      setLoading(false);
      // allow re-upload of the same file
      e.target.value = '';
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text || '');
    } catch {}
  }

  function onDownloadTxt() {
    const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileName?.replace(/\.[^.]+$/, '') || 'ocr') + '.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="application/pdf"
          onChange={onPickFile}
          disabled={loading}
        />
        <Button onClick={onCopy} disabled={!text || loading}>Copy</Button>
        <Button onClick={onDownloadTxt} disabled={!text || loading} variant="secondary">Download .txt</Button>
        {usedOCR && <Badge>OCR</Badge>}
        {textLength > 0 && <Badge variant="outline">{textLength} chars</Badge>}
      </div>

      {fileName && (
        <div className="text-sm opacity-70">
          {loading ? 'Reading…' : `File: ${fileName}`}
        </div>
      )}

      {err && <div className="text-red-600 text-sm">{err}</div>}

      <Textarea
        className="w-full h-[50vh]"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="OCR text will appear here…"
      />
    </div>
  );
}
