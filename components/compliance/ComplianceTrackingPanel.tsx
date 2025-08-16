"use client";
import { useEffect, useState } from "react";
import StatusPill from "./StatusPill";

type Row = {
  bca_id:string; asset_id:string; asset_name:string; category:string;
  frequency_months:number|null;
  last_renewed_date:string|null; next_due_date:string|null;
  status:string; docs_count:number; notes:string|null; contractor:string|null;
};

export default function ComplianceTrackingPanel({
  buildingId, buildingName, inboxUserId
}: { buildingId:string; buildingName?:string; inboxUserId?:string|null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);

  async function load() {
    const r = await fetch(`/api/buildings/${buildingId}/compliance`, { cache:"no-store" });
    const j = await r.json(); if (!r.ok) throw new Error(j.error||"Failed");
    setRows(j.data || []);
  }
  useEffect(() => { setLoading(true); load().catch(e=>setErr(e.message)).finally(()=>setLoading(false)); }, [buildingId]);

  async function update(bca_id:string, patch:any) {
    const r = await fetch(`/api/compliance/${bca_id}/update`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(patch) });
    if (r.ok) await load();
  }
  async function reminder(row:Row) {
    const r = await fetch("/api/compliance/reminder", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ bca: row, building: { name: buildingName }, inbox_user_id: inboxUserId||null })
    });
    const j = await r.json();
    if (j.mode === "outlook_event" && j.draft?.webLink) window.open(j.draft.webLink, "_blank");
    else if (j.mode === "ics" && j.ics) {
      const blob = new Blob([j.ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      a.href = url; a.download = "compliance_reminder.ics"; a.click(); URL.revokeObjectURL(url);
    }
  }

  if (loading) return <div className="text-sm text-neutral-500">Loading tracking…</div>;
  if (err) return <div className="text-sm text-red-600">Couldn't load: {err}</div>;
  if (!rows.length) return <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">No assets selected yet. Switch to Setup Mode to add items.</div>;

  return (
    <div className="overflow-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-neutral-50 text-neutral-600">
          <tr>
            <th className="px-4 py-2 text-left">Asset</th>
            <th className="px-4 py-2 text-left">Category</th>
            <th className="px-4 py-2 text-left">Last renewed</th>
            <th className="px-4 py-2 text-left">Next due</th>
            <th className="px-4 py-2 text-left">Status</th>
            <th className="px-4 py-2 text-left">Docs</th>
            <th className="px-4 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((r) => (
            <tr key={r.bca_id} className="hover:bg-neutral-50/60">
              <td className="px-4 py-2">{r.asset_name}</td>
              <td className="px-4 py-2">{r.category}</td>
              <td className="px-4 py-2">
                <input type="date" defaultValue={r.last_renewed_date || ""} onChange={e=>update(r.bca_id,{ last_renewed_date: e.target.value })} className="rounded border border-neutral-300 px-2 py-1" />
              </td>
              <td className="px-4 py-2">
                <input type="date" defaultValue={r.next_due_date || ""} onChange={e=>update(r.bca_id,{ next_due_date: e.target.value })} className="rounded border border-neutral-300 px-2 py-1" />
              </td>
              <td className="px-4 py-2"><StatusPill status={r.status as any} /></td>
              <td className="px-4 py-2">{r.docs_count || 0}</td>
              <td className="px-4 py-2">
                <div className="flex gap-2">
                  <button onClick={()=>reminder(r)} className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50">Reminder</button>
                  <button onClick={()=>update(r.bca_id,{ status_override: "" })} className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50">Clear override</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
