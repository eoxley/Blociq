"use client";
import { useEffect, useState } from "react";
import GradientHeader from "@/components/ui/GradientHeader";
import { StageBadge } from "@/components/ui/StatusDot";

type Project = {
  id:string; building_id:string; title:string; stage:string; s20_required:boolean;
  s20_stage:string|null; budget_estimate:number|null; next_milestone:string|null; next_milestone_date:string|null;
  buildings?: { name:string };
};

export default function MajorWorksPage() {
  const [rows, setRows] = useState<Project[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load(){ const j = await fetch("/api/major-works/projects").then(r=>r.json()); setRows(j.data || []); }
  useEffect(()=>{ setLoading(true); load().finally(()=>setLoading(false)); }, []);

  return (
    <div className="space-y-4">
      <GradientHeader title="Major Works" subtitle="Pipeline across the portfolio" />

      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-600">{rows.length} projects</div>
        <button onClick={()=>setOpenNew(true)} className="rounded-lg bg-neutral-900 text-white px-3 py-1.5 text-sm">New project</button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(p => (
          <div key={p.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-neutral-900">{p.title}</div>
              <StageBadge stage={p.stage} />
            </div>
            <div className="text-xs text-neutral-500">{p.buildings?.name || "—"}</div>
            <div className="mt-2 text-sm text-neutral-700 space-y-1">
              <div><span className="text-neutral-500">S20:</span> {p.s20_required ? (p.s20_stage || "Required") : "Not required"}</div>
              <div><span className="text-neutral-500">Budget:</span> {p.budget_estimate != null ? `£${Number(p.budget_estimate).toLocaleString()}` : "—"}</div>
              <div><span className="text-neutral-500">Next:</span> {p.next_milestone || "—"} {p.next_milestone_date ? `(${p.next_milestone_date})` : ""}</div>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={()=>schedule(p)} className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50 text-sm">Add to Outlook</button>
              <button onClick={()=>tender(p)} className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50 text-sm">Draft tender email</button>
            </div>
          </div>
        ))}
        {!rows.length && !loading ? <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-neutral-600">No projects yet.</div> : null}
      </div>

      {openNew ? <NewProjectModal onClose={()=>setOpenNew(false)} onCreate={()=>{ setOpenNew(false); load(); }} /> : null}
    </div>
  );

  async function schedule(p:Project){
    const startISO = (p.next_milestone_date || new Date().toISOString().slice(0,10)) + "T09:00:00";
    const endISO   = (p.next_milestone_date || new Date().toISOString().slice(0,10)) + "T10:00:00";
    const res = await fetch("/api/compliance/reminder", {  // reuse reminder route
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ bca: { asset_name: p.next_milestone || p.title, next_due_date: startISO.slice(0,10) }, building: { name: p.buildings?.name||"" }, inbox_user_id: null })
    }).then(r=>r.json());
    if (res.mode === "outlook_event" && res.draft?.webLink) window.open(res.draft.webLink, "_blank");
    else if (res.mode === "ics" && res.ics) downloadICS(res.ics, "major_works.ics");
  }
  async function tender(p:Project){
    const payload = { building: { name: p.buildings?.name }, work: { title: p.title, stage: p.stage }, return_by: p.next_milestone_date, contact:{}, extras:{} };
    const j = await fetch("/api/tender/prepare", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) }).then(r=>r.json());
    const mailto = `mailto:?subject=${encodeURIComponent(j.subject)}&body=${encodeURIComponent(j.body)}`;
    window.location.href = mailto;
  }
  function downloadICS(text:string, filename:string){ const blob=new Blob([text],{type:"text/calendar"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); }
}

function NewProjectModal({ onClose, onCreate }: { onClose:()=>void; onCreate:()=>void }) {
  const [form, setForm] = useState<any>({ title:"", building_id:"", stage:"planning", s20_required:false });
  async function submit(){
    await fetch("/api/major-works/projects", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(form) });
    onCreate();
  }
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-xl">
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold">New Major Works Project</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-neutral-100">✕</button>
        </div>
        <div className="p-4 grid gap-3">
          <input className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="Title" value={form.title} onChange={e=>setForm({...form, title:e.target.value})}/>
          <input className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="Building ID (temporarily)" value={form.building_id} onChange={e=>setForm({...form, building_id:e.target.value})}/>
          <select className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" value={form.stage} onChange={e=>setForm({...form, stage:e.target.value})}>
            <option value="planning">planning</option><option value="s20_precons">s20_precons</option><option value="tender">tender</option><option value="in_progress">in_progress</option><option value="complete">complete</option><option value="on_hold">on_hold</option>
          </select>
          <label className="text-sm inline-flex items-center gap-2">
            <input type="checkbox" checked={form.s20_required} onChange={e=>setForm({...form, s20_required:e.target.checked})}/> Section 20 required
          </label>
          <input type="date" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" value={form.next_milestone_date||""} onChange={e=>setForm({...form, next_milestone_date:e.target.value})}/>
          <input className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" placeholder="Next milestone label" value={form.next_milestone||""} onChange={e=>setForm({...form, next_milestone:e.target.value})}/>
        </div>
        <div className="px-4 py-3 border-t border-neutral-100 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">Cancel</button>
          <button onClick={submit} className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white">Create</button>
        </div>
      </div>
    </div>
  );
}
