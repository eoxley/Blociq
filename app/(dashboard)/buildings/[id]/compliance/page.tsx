"use client";
import { useEffect, useState } from "react";
import ComplianceSetupPanel from "@/components/compliance/ComplianceSetupPanel";
import ComplianceTrackingPanel from "@/components/compliance/ComplianceTrackingPanel";

export default function BuildingCompliancePage({ params }: { params: { id: string } }) {
  const buildingId = params.id;
  const [mode, setMode] = useState<"setup"|"tracking">("setup");
  const [hasRows, setHasRows] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  async function refreshHasRows() {
    const r = await fetch(`/api/buildings/${buildingId}/compliance`, { cache:"no-store" });
    const j = await r.json();
    setHasRows((j.data || []).length > 0);
  }

  useEffect(() => {
    setLoading(true);
    refreshHasRows().finally(()=>setLoading(false));
  }, [buildingId]);

  useEffect(() => {
    // default to tracking if there are rows; otherwise setup
    if (!loading) setMode(hasRows ? "tracking" : "setup");
  }, [loading, hasRows]);

  return (
    <div className="space-y-4">
      {/* DO NOT edit hero/banner per requirement */}

      {/* Summary cards could be added later; keep page clean for now */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("setup")}
          className={`rounded-md px-3 py-1.5 text-sm border ${mode==="setup" ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300 hover:bg-neutral-50"}`}
        >Setup Mode</button>
        <button
          onClick={() => setMode("tracking")}
          className={`rounded-md px-3 py-1.5 text-sm border ${mode==="tracking" ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-300 hover:bg-neutral-50"}`}
        >Tracking Mode</button>
      </div>

      {mode === "setup" ? (
        <ComplianceSetupPanel buildingId={buildingId} onSaved={refreshHasRows} />
      ) : (
        <ComplianceTrackingPanel buildingId={buildingId} />
      )}
    </div>
  );
}
