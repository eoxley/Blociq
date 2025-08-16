"use client";
import { useEffect, useState } from "react";
import SetupComplianceModalV2 from "@/components/compliance/SetupComplianceModalV2";
import ComplianceTrackingPanel from "@/components/compliance/ComplianceTrackingPanel";

export default function BuildingCompliancePage({ params }: { params: { id: string } }) {
  const buildingId = params.id;
  const [open, setOpen] = useState(false);
  const [hasRows, setHasRows] = useState(false);
  const [mode, setMode] = useState<"setup"|"tracking">("setup");

  async function refresh() {
    const j = await fetch(`/api/buildings/${buildingId}/compliance`, { cache:"no-store" }).then(r=>r.json());
    const any = (j.data || []).length > 0;
    setHasRows(any); if (any) setMode("tracking");
  }

  useEffect(()=>{ refresh(); }, [buildingId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={()=>setOpen(true)} className="rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm">
          Setup compliance
        </button>
        <button onClick={()=>setMode("setup")} className={`rounded-md px-3 py-1.5 text-sm border ${mode==="setup" ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300 hover:bg-neutral-50"}`}>Setup Mode</button>
        <button onClick={()=>setMode("tracking")} className={`rounded-md px-3 py-1.5 text-sm border ${mode==="tracking" ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300 hover:bg-neutral-50"}`}>Tracking Mode</button>
      </div>

      {mode === "tracking" && hasRows ? (
        <ComplianceTrackingPanel buildingId={buildingId} />
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          No assets selected yet. Click <strong>Setup compliance</strong> to begin.
        </div>
      )}

      <SetupComplianceModalV2
        open={open}
        buildingId={buildingId}
        onClose={()=>setOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}