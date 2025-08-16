"use client";
import { useEffect, useMemo, useState } from "react";

type Asset = { 
  id: string; 
  title: string; 
  category: string; 
  description?: string | null; 
  frequency_months?: number | null 
};

type Props = {
  open: boolean;
  buildingId: string;
  onClose: () => void;
  onSaved: () => void;  // refresh + switch to Tracking
};

export default function SetupComplianceModal({ open, buildingId, onClose, onSaved }: Props) {
  const [master, setMaster] = useState<Asset[]>([]);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const [m, s] = await Promise.all([
          fetch("/api/compliance/assets/list").then(r => r.json()),
          fetch(`/api/buildings/${buildingId}/compliance/selected`, { cache: "no-store" }).then(r => r.json()),
        ]);
        if (!alive) return;
        const ex = new Set<string>((s.asset_ids || []) as string[]);
        setExisting(ex);
        setMaster(m.data || []);
        // pre-tick existing
        const pre: Record<string, boolean> = {};
        for (const id of ex) pre[id] = true;
        setSelected(pre);
      } catch (e: any) { 
        setErr(e.message || "Failed to load"); 
      }
    })();
    return () => { alive = false; };
  }, [open, buildingId]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return master.filter(a => !t || a.title.toLowerCase().includes(t) || a.category.toLowerCase().includes(t));
  }, [master, q]);

  const grouped = useMemo(() => {
    const g: Record<string, Asset[]> = {};
    for (const a of filtered) (g[a.category || "Other"] ||= []).push(a);
    return g;
  }, [filtered]);

  const newlyChosen = Object.keys(selected).filter(id => selected[id] && !existing.has(id));
  const canSave = newlyChosen.length > 0 && !busy;

  function toggle(id: string) { 
    setSelected(s => ({ ...s, [id]: !s[id] })); 
  }
  
  function selectAll(cat: string, on: boolean) {
    const next = { ...selected };
    for (const a of grouped[cat] || []) next[a.id] = on || existing.has(a.id);
    setSelected(next);
  }

  async function save() {
    if (!canSave) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/buildings/${buildingId}/compliance/bulk-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_ids: newlyChosen })
      }).then(r => r.json());
      if (r.error) throw new Error(r.error);
      onSaved();           // parent will flip to Tracking Mode and refresh
      onClose();
    } catch (e: any) {
      setErr(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl border-l border-neutral-200 flex flex-col">
        <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-500">Compliance setup</div>
            <h3 className="text-lg font-semibold text-neutral-900">Select compliance assets</h3>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-neutral-100" aria-label="Close">✕</button>
        </header>

        <div className="p-4 flex items-center justify-between gap-2">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search assets, categories…"
            className="w-full max-w-sm rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <div className="text-xs text-neutral-500">
            Selected: <span className="font-medium text-neutral-800">{Object.values(selected).filter(Boolean).length}</span>
            {" "}(new: {newlyChosen.length})
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4 pb-4 space-y-4">
          {err ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-sm text-neutral-500 p-4">No matches.</div>
          ) : (
            Object.entries(grouped).map(([cat, items]) => (
              <section key={cat} className="rounded-xl border border-neutral-200">
                <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 border-b border-neutral-200">
                  <div className="text-sm font-semibold text-neutral-700">{cat}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => selectAll(cat, true)} className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50">Select all</button>
                    <button onClick={() => selectAll(cat, false)} className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50">Clear</button>
                  </div>
                </div>
                <ul className="divide-y divide-neutral-100">
                  {items.map(a => {
                    const already = existing.has(a.id);
                    const checked = !!selected[a.id];
                    return (
                      <li key={a.id} className="flex items-center gap-3 px-3 py-3 hover:bg-neutral-50">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          disabled={already}
                          onChange={() => toggle(a.id)}
                        />
                        <div className="flex-1">
                          <div className="text-sm text-neutral-900">
                            {a.title}{" "}
                            {a.frequency_months ? <span className="text-neutral-500">• every {a.frequency_months} months</span> : null}
                          </div>
                          {a.description ? <div className="text-xs text-neutral-500">{a.description}</div> : null}
                          {already ? <div className="text-xs text-emerald-700">Already tracking</div> : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        <footer className="px-5 py-3 border-t border-neutral-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">Cancel</button>
          <button
            onClick={save}
            disabled={!canSave}
            className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-violet-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save setup"}
          </button>
        </footer>
      </div>
    </div>
  );
}
