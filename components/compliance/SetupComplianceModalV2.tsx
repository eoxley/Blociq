"use client";
import { useEffect, useMemo, useState } from "react";

type Asset = { id:string; name:string; category:string; description?:string|null; frequency_months?:number|null; frequency?:string|null };

export default function SetupComplianceModalV2({
  open, buildingId, onClose, onSaved
}: { open:boolean; buildingId:string; onClose:()=>void; onSaved:()=>void }) {
  const [master, setMaster] = useState<Asset[]>([]);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [locked, setLocked]     = useState<Set<string>>(new Set()); // HRB-locked
  const [hrb, setHrb] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({}); // per asset file

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const [m, s] = await Promise.all([
          fetch("/api/compliance/assets/list").then(r=>r.json()),
          fetch(`/api/buildings/${buildingId}/compliance/selected`, { cache:"no-store" }).then(r=>r.json())
        ]);
        if (!alive) return;
        setMaster(m.data || []);
        const ex = new Set<string>((s.asset_ids || []) as string[]);
        setExisting(ex);
        const pre: Record<string, boolean> = {};
        ex.forEach(id => pre[id] = true);
        setSelected(pre);
      } catch (e:any) { setErr(e.message||"Failed to load"); }
    })();
    return () => { alive = false; };
  }, [open, buildingId]);

  // HRB preset
  useEffect(() => {
    if (!open) return;
    const hrbIds = new Set(master.filter(a => /^HRB/i.test(a.category)).map(a => a.id));
    if (hrb) {
      const next = { ...selected };
      hrbIds.forEach(id => next[id] = true);
      setSelected(next);
      setLocked(hrbIds);
    } else {
      // unlock but keep user's choices
      setLocked(new Set());
    }
  }, [hrb, master, open]); // eslint-disable-line

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return master.filter(a => !t || a.name.toLowerCase().includes(t) || a.category.toLowerCase().includes(t));
  }, [master, q]);

  const grouped = useMemo(() => {
    const g: Record<string, Asset[]> = {};
    for (const a of filtered) (g[a.category||"Other"] ||= []).push(a);
    return g;
  }, [filtered]);

  const isChecked = (id:string) => !!selected[id];
  const isLocked  = (id:string) => locked.has(id);
  const toggle = (id:string) => { if (isLocked(id)) return; setSelected(s => ({ ...s, [id]: !s[id] })); };

  function selectAll(cat:string, on:boolean) {
    const next = { ...selected };
    for (const a of grouped[cat] || []) {
      if (isLocked(a.id)) { next[a.id] = true; continue; }
      next[a.id] = on || existing.has(a.id);
    }
    setSelected(next);
  }

  const newlyChosen = Object.keys(selected).filter(id => selected[id] && !existing.has(id));
  const canSave = newlyChosen.length > 0 && !busy;

  // Save: add rows, fetch ids, then upload files mapped to each bca row
  async function save() {
    if (!canSave) return;
    setBusy(true);
    try {
      // 1) Add building assets
      const add = await fetch(`/api/buildings/${buildingId}/compliance/bulk-add`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ asset_ids: newlyChosen })
      }).then(r=>r.json());
      if (add.error) throw new Error(add.error);

      // 2) Map compliance_asset_id -> bca_id
      const j = await fetch(`/api/buildings/${buildingId}/compliance`, { cache:"no-store" }).then(r=>r.json());
      const bcaByAsset: Record<string,string> = {};
      for (const row of (j.data || [])) bcaByAsset[row.asset_id] = row.bca_id;

      // 3) Upload files (only for those with a file)
      for (const assetId of newlyChosen) {
        const f = files[assetId];
        if (!f) continue;
        const bca_id = bcaByAsset[assetId];
        if (!bca_id) continue;
        const form = new FormData();
        form.append("file", f);
        form.append("bca_id", bca_id);
        form.append("building_id", buildingId);
        await fetch("/api/compliance/upload", { method:"POST", body: form });
      }

      onSaved();
      onClose();
    } catch (e:any) {
      setErr(e.message || "Save failed");
    } finally { setBusy(false); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-2xl border-l border-neutral-200 flex flex-col">
        <header className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-500">Compliance setup</div>
            <h3 className="text-lg font-semibold text-neutral-900">Select compliance assets</h3>
          </div>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-neutral-100" aria-label="Close">✕</button>
        </header>

        <div className="px-5 py-3 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hrb} onChange={e=>setHrb(e.target.checked)} />
            Mark this building as <strong>HRB</strong> (apply BSA items)
          </label>
          <div className="flex-1" />
          <input
            value={q}
            onChange={e=>setQ(e.target.value)}
            placeholder="Search assets or categories…"
            className="w-full max-w-sm rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex-1 overflow-auto px-5 pb-5 grid gap-4 md:grid-cols-2">
          {Object.entries(grouped).map(([cat, items]) => (
            <section key={cat} className="rounded-2xl border border-neutral-200">
              <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 border-b border-neutral-200 rounded-t-2xl">
                <div className="text-sm font-semibold text-neutral-700">{cat}</div>
                <div className="flex items-center gap-2">
                  <button onClick={()=>selectAll(cat,true)} className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50">Select all</button>
                  <button onClick={()=>selectAll(cat,false)} className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50">Clear</button>
                </div>
              </div>
              <ul className="divide-y divide-neutral-100">
                {items.map(a => (
                  <li key={a.id} className="px-3 py-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 mt-1"
                        checked={isChecked(a.id)}
                        disabled={existing.has(a.id) || isLocked(a.id)}
                        onChange={()=>toggle(a.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-neutral-900">{a.name}</div>
                          {a.frequency_months ? <span className="text-xs text-neutral-500">• every {a.frequency_months} months</span> : null}
                          {a.frequency ? <span className="text-xs text-neutral-500">• {a.frequency}</span> : null}
                          {isLocked(a.id) && <span className="text-xs rounded-full bg-fuchsia-50 text-fuchsia-700 px-2 py-0.5">HRB mandated</span>}
                          {existing.has(a.id) && <span className="text-xs rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">Already tracking</span>}
                        </div>
                        {a.description ? <div className="text-xs text-neutral-500 mt-0.5">{a.description}</div> : null}

                        {/* Upload only when selected and not already tracked */}
                        {isChecked(a.id) && !existing.has(a.id) && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="file"
                              onChange={e => {
                                const f = e.target.files?.[0] || null;
                                setFiles(prev => ({ ...prev, [a.id]: f }));
                              }}
                              className="text-xs"
                            />
                            {files[a.id] ? <span className="text-xs text-neutral-600">{files[a.id]?.name}</span> : <span className="text-xs text-neutral-400">Attach current document (optional)</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="px-5 py-3 border-t border-neutral-100 flex items-center justify-end gap-2">
          {err ? <div className="mr-auto text-sm text-red-600">{err}</div> : null}
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
