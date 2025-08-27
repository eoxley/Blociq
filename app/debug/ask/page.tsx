'use client';
import { useState } from 'react';

export default function AskXray() {
  const [q, setQ] = useState('who is the leaseholder of 5 ashwood house');
  const [json, setJson] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setJson(null);
    try {
      const r = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const j = await r.json();
      setJson(j);
    } catch (error) {
      setJson({ error: error.message });
    }
    setLoading(false);
  }

  const testQuestions = [
    'who is the leaseholder of 5 ashwood house',
    'leaseholder of flat 5 Ashwood House',
    'who owns 5 Ashwood House',
    'what is the leaseholder of unit 5 at Ashwood House'
  ];

  return (
    <div className="mx-auto max-w-xl p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Ask BlocIQ — Hotfix Test</h1>
      <p className="text-sm text-gray-600">Testing the restored data-aware functionality</p>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">Question:</label>
        <input 
          className="w-full border rounded-lg px-3 py-2" 
          value={q} 
          onChange={(e) => setQ(e.target.value)} 
        />
      </div>
      
      <button 
        className="px-4 py-2 rounded-lg bg-black text-white w-full" 
        onClick={run}
        disabled={loading}
      >
        {loading ? 'Running…' : 'Test Hotfix'}
      </button>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Quick Test Questions:</label>
        <div className="space-y-1">
          {testQuestions.map((question, i) => (
            <button
              key={i}
              className="block w-full text-left text-sm text-blue-600 hover:text-blue-800 p-2 rounded border hover:bg-blue-50"
              onClick={() => setQ(question)}
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {json && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Response:</label>
          <pre className="text-xs bg-slate-50 p-3 rounded-lg overflow-auto">
            {JSON.stringify(json, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="text-xs text-gray-500 space-y-1">
        <a className="text-blue-600 hover:underline block" href="/api/ask-ai/health" target="_blank">
          Healthcheck
        </a>
        <p>Expected: Direct DB answers for leaseholder queries, fallback for unknown data</p>
      </div>
    </div>
  );
}
