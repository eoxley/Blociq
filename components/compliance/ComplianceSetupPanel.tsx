"use client";
import { useEffect, useMemo, useState } from "react";

type Asset = { id:string; name:string; category:string; description?:string|null; frequency_months?:number|null };
type Selected = Record<string, boolean>;

export default function ComplianceSetupPanel({
  buildingId,
  onSaved
}: { buildingId: string; onSaved: () => void }) {
  const [master, setMaster] = useState<Asset[]>([]);
  const [existing, setExisting] = useState<Set<string>>(new Set()); // asset_ids already on building
  const [selected, setSelected] = useState<Selected>({});
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string|null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [m, b] = await Promise.all([
          fetch("/api/compliance/assets/list").then(r=>r.json()),
          fetch(`/api/buildings/${buildingId}/compliance`, { cache:"no-store" }).then(r=>r.json())
        ]);
        if (!alive) return;
        const ex = new Set<string>((b.data||[]).map((r:any) => r.asset_id));
        setExisting(ex);
        setMaster(m.data || []);
      } catch (e:any) { setLoadErr(e.message||"Failed"); }
    })();
    return () => { alive = false; };
  }, [buildingId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return master.filter(a =>
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  }, [master, query]);

  const grouped = useMemo(() => {
    const map: Record<string, Asset[]> = {};
    for (const a of filtered) {
      (map[a.category||"Other"] ||= []).push(a);
    }
    return map;
  }, [filtered]);

  function toggle(id:string) { setSelected(s => ({ ...s, [id]: !s[id] })); }
  function selectAll(cat:string, on:boolean) {
    const next = { ...selected };
    for (const a of grouped[cat] || []) next[a.id] = on;
    setSelected(next);
  }

  const newlyChosen = Object.keys(selected).filter(id => selected[id] && !existing.has(id));
  const canSave = newlyChosen.length > 0 && !busy;

  async function save() {
    if (!canSave) return;
    setBusy(true);
    try {
      // add each selected (bulk is fine, but keep it simple & safe)
      for (const assetId of newlyChosen) {
        await fetch(`/api/buildings/${buildingId}/compliance/add`, {
          method:"POST", headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ compliance_asset_id: assetId })
        });
      }
      onSaved();
      // set to "existing"
      const ex = new Set(existing);
      newlyChosen.forEach(id => ex.add(id));
      setExisting(ex);
      setSelected({});
    } finally { setBusy(false); }
  }

  if (loadErr) return <div className="text-sm text-red-600">Couldn't load assets: {loadErr}</div>;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-neutral-800">Setup Compliance Tracking</div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={e=>setQuery(e.target.value)}
            placeholder="Search assets…"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            disabled={!canSave}
            onClick={save}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save setup"}
          </button>
        </div>
      </div>

      <div className="px-2 pb-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="p-4 text-sm text-neutral-500">No assets match your search.</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, items]) => (
              <section key={cat} className="border-t border-neutral-100 pt-3">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-sm font-semibold text-neutral-700">{cat}</h4>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={()=>selectAll(cat, true)}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
                    >Select all</button>
                    <button
                      onClick={()=>selectAll(cat, false)}
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
                    >Clear</button>
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {items.map(a => {
                    const already = existing.has(a.id);
                    const ticked = selected[a.id] || already;
                    return (
                      <li key={a.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-neutral-50">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={ticked}
                          disabled={already}
                          onChange={()=>toggle(a.id)}
                        />
                        <div className="flex-1">
                          <div className="text-sm text-neutral-900">{a.name} {a.frequency_months ? <span className="text-neutral-500">• every {a.frequency_months} months</span> : null}</div>
                          {a.description ? <div className="text-xs text-neutral-500">{a.description}</div> : null}
                          {already ? <div className="text-xs text-emerald-700">Already tracking</div> : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
