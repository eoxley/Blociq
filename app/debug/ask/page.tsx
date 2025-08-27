'use client';
import { useState } from 'react';

export default function AskXray() {
  const [q, setQ] = useState('who is the leaseholder of 5 ashwood house');
  const [json, setJson] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setJson(null);
    const r = await fetch('/api/ask-ai?debug=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    });
    const j = await r.json();
    setJson(j);
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Ask BlocIQ — X-ray</h1>
      <input className="w-full border rounded-lg px-3 py-2" value={q} onChange={(e)=>setQ(e.target.value)} />
      <button className="px-4 py-2 rounded-lg bg-black text-white" onClick={run}>{loading ? 'Running…' : 'Run debug'}</button>
      <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-auto">{JSON.stringify(json, null, 2)}</pre>
      <a className="text-xs underline" href="/api/ask-ai/health" target="_blank">Healthcheck</a>
    </div>
  );
}
