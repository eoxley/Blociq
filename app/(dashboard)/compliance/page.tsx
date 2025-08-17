"use client";
import { useEffect, useState } from "react";
import GradientHeader from "@/components/ui/GradientHeader";
import Link from "next/link";

type CountRow = { building_id:string; building_name:string; total:number; compliant:number; due_soon:number; overdue:number; missing:number };
type UpcomingRow = { building_id:string; building_name:string; asset_name:string; category:string; bca_id:string; next_due_date:string; status:string };

export default function CompliancePortfolioPage() {
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [c, u] = await Promise.all([
      fetch("/api/portfolio/compliance/summary").then(r=>r.json()),
      fetch("/api/portfolio/compliance/upcoming").then(r=>r.json())
    ]);
    setCounts(c.data || []); setUpcoming(u.data || []);
  }

  useEffect(() => { setLoading(true); load().finally(()=>setLoading(false)); }, []);

  return (
    <div className="space-y-4">
      <GradientHeader title="Compliance Portfolio" subtitle="Live status across all buildings" />

      {/* Summary grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {counts.map(row => (
          <Link 
            key={row.building_id} 
            href={`/buildings/${row.building_id}/compliance`}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="text-sm font-semibold text-neutral-800">{row.building_name}</div>
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              <Card label="Total" v={row.total} />
              <Card label="Compliant" v={row.compliant} tone="text-emerald-700" />
              <Card label="Due soon" v={row.due_soon} tone="text-amber-800" />
              <Card label="Overdue" v={row.overdue} tone="text-red-700" />
            </div>
          </Link>
        ))}
      </div>

      {/* Upcoming table (90 days) */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-auto">
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
          <div className="text-sm font-semibold text-neutral-800">Upcoming (next 90 days)</div>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-600">
            <tr>
              <th className="px-4 py-2 text-left">Building</th>
              <th className="px-4 py-2 text-left">Asset</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Due</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {upcoming.map((r, i) => (
              <tr key={`${r.bca_id}-${i}`} className="hover:bg-neutral-50/60">
                <td className="px-4 py-2">{r.building_name}</td>
                <td className="px-4 py-2">{r.asset_name}</td>
                <td className="px-4 py-2">{r.category}</td>
                <td className="px-4 py-2">{r.next_due_date}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button onClick={() => addToOutlook(r)} className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50">Add to Outlook</button>
                    <button onClick={() => draftTender(r)} className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50">Draft tender email</button>
                  </div>
                </td>
              </tr>
            ))}
            {!upcoming.length && !loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-neutral-500">No upcoming compliance items</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );

  async function addToOutlook(r: UpcomingRow) {
    const body = {
      bca: { asset_name: r.asset_name, next_due_date: r.next_due_date, notes: "" },
      building: { name: r.building_name },
      inbox_user_id: null
    };
    const res = await fetch("/api/compliance/reminder", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) }).then(r=>r.json());
    if (res.mode === "outlook_event" && res.draft?.webLink) window.open(res.draft.webLink, "_blank");
    else if (res.mode === "ics" && res.ics) downloadICS(res.ics, "compliance.ics");
  }
  async function draftTender(r: UpcomingRow) {
    const payload = { building: { name: r.building_name }, work: { title: `${r.asset_name} service/inspection` }, return_by: r.next_due_date, contact: {}, extras: {} };
    const j = await fetch("/api/tender/prepare", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) }).then(r=>r.json());
    const mailto = `mailto:?subject=${encodeURIComponent(j.subject)}&body=${encodeURIComponent(j.body)}`;
    window.location.href = mailto; // soft fallback (Outlook draft route can be added later)
  }
  function downloadICS(text:string, filename:string){ const blob=new Blob([text],{type:"text/calendar"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); }

  function Card({label,v,tone}:{label:string;v:number;tone?:string}){ return <div className="rounded-xl border border-neutral-200 p-3 text-center"><div className="text-xs text-neutral-500">{label}</div><div className={`text-lg font-semibold ${tone||"text-neutral-900"}`}>{v}</div></div>; }
}
