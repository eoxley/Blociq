"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SmartUploader from "@/components/SmartUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export default function LeaseUploadPage() {
  const [buildings, setBuildings] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [buildingId, setBuildingId] = useState<number | null>(null);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [isHeadlease, setIsHeadlease] = useState(false);

  // Load buildings
  useEffect(() => {
    const loadBuildings = async () => {
      const { data, error } = await supabase.from("buildings").select("*");
      if (data) setBuildings(data);
    };
    loadBuildings();
  }, []);

  // Load units for selected building
  useEffect(() => {
    const loadUnits = async () => {
      if (!buildingId) return;
      const { data } = await supabase
        .from("units")
        .select("*")
        .eq("building_id", buildingId);
      setUnits(data || []);
    };
    loadUnits();
  }, [buildingId]);

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">📄 Upload Lease</h1>

      {/* Building Dropdown */}
      <div className="mb-4">
        <Label>Building</Label>
        <select
          className="w-full border p-2 rounded"
          value={buildingId || ""}
          onChange={(e) => {
            const id = Number(e.target.value);
            setBuildingId(id);
            setUnitId(null); // reset unit when building changes
          }}
        >
          <option value="">-- Select Building --</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Headlease Toggle */}
      <div className="flex items-center mb-4 gap-2">
        <Checkbox
          id="headlease"
          checked={isHeadlease}
          onCheckedChange={(v) => setIsHeadlease(!!v)}
        />
        <Label htmlFor="headlease">This is the headlease</Label>
      </div>

      {/* Unit Dropdown (only if not headlease) */}
      {!isHeadlease && (
        <div className="mb-4">
          <Label>Unit / Flat</Label>
          <select
            className="w-full border p-2 rounded"
            value={unitId || ""}
            onChange={(e) => setUnitId(Number(e.target.value))}
          >
            <option value="">-- Select Unit --</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unit_number}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Upload Widget */}
      {buildingId && (
        <SmartUploader
          table="leases"
          docTypePreset="Lease"
          buildingId={buildingId}
          unitId={!isHeadlease ? unitId : undefined}
          // uploadedBy={authUser.id} <-- add when ready
          onSaveSuccess={() => {
            alert("✅ Lease uploaded successfully");
          }}
        />
      )}
    </main>
  );
}
