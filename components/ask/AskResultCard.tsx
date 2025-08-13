'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { performAskAction } from '@/lib/ask/perform-action';

export function AskResultCard({ data }: { data: any }) {
  const router = useRouter();
  const [msg, setMsg] = React.useState<string|undefined>();
  const [busy, setBusy] = React.useState<string|undefined>();
  const unassigned = !data?.context?.buildingId || data?.context?.buildingStatus !== 'matched';

  const onAction = async (key: string) => {
    setMsg(undefined); setBusy(key);
    const res = await performAskAction(key, {
      summary: data?.summary,
      filename: data?.context?.filename ?? 'document',
      buildingId: data?.context?.buildingId ?? null,
      textExcerpt: data?.textExcerpt,
    });
    setBusy(undefined);
    if (res.redirect) router.push(res.redirect);
    setMsg(res.message || (res.ok ? 'Done.' : 'Something went wrong.'));
  };

  return (
    <div className="mt-6 p-5 rounded-2xl border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold">Summary</h3>
        {unassigned && <span className="text-xs px-2 py-1 rounded bg-yellow-50 border">Unassigned</span>}
      </div>
      <pre className="whitespace-pre-wrap text-sm">{data?.summary}</pre>

      {Array.isArray(data?.suggestedActions) && data.suggestedActions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.suggestedActions.map((a:any, i:number) => (
            <button
              key={i}
              onClick={()=>onAction(a.key)}
              disabled={!!busy}
              className="px-3 py-2 rounded-xl border shadow-sm text-sm"
              title={a.key}
            >
              {busy === a.key ? 'Working…' : (a.label || a.key)}
            </button>
          ))}
        </div>
      )}
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  );
}
