"use client"

import React from 'react';
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface Leaseholder {
  full_name: string;
  email: string;
}

interface Unit {
  id: string;
  unit_number: string;
  leaseholders: Leaseholder[];
}

export default function UnitsListForBuilding() {
  const params = useParams();
  const buildingId = params?.buildingId as string | undefined;
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  console.log('UnitsListForBuilding component rendered');
  console.log('Params:', params);
  console.log('Building ID:', buildingId);

  useEffect(() => {
    if (!buildingId) {
      setError("No building ID provided in URL.");
      setLoading(false);
      return;
    }
    const fetchUnits = async () => {
      setLoading(true);
      setError(null);
      console.log('Fetching units for building ID:', buildingId);
      
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, leaseholders!inner(full_name, email)")
        .eq("building_id", buildingId);
      
      console.log('Units query result:', { data, error });
      
      if (error) {
        console.error('Supabase error:', error);
        setError(error.message);
        setUnits([]);
      } else {
        console.log('Setting units:', data);
        setUnits(data || []);
      }
      setLoading(false);
    };
    fetchUnits();
  }, [buildingId, supabase]);

  if (loading) return <div>Loading units...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!units.length) return <div>No units found for this building. (Building ID: {buildingId})</div>;

  return (
    <ul className="space-y-2">
      {units.map((unit) => (
        <li key={unit.id}>
          Flat {unit.unit_number} – {unit.leaseholders && unit.leaseholders.length > 0 ? `${unit.leaseholders[0].full_name} (${unit.leaseholders[0].email})` : "No leaseholder assigned"}
        </li>
      ))}
    </ul>
  );
} 