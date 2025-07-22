'use client';

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

interface Unit {
  id: string;
  unit_number: string;
  leaseholders?: {
    name: string;
    email: string;
  }[];
}

export default function UnitsSection({ buildingId }: { buildingId: string }) {
  const supabase = createClientComponentClient();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUnits = async () => {
      const { data, error } = await supabase
        .from('units')
        .select(`
          id,
          unit_number,
          leaseholder_id,
          leaseholders (
            name,
            email
          )
        `)
        .eq('building_id', buildingId);

      if (error) {
        console.error('Error fetching units:', error.message);
      } else {
        setUnits(data);
      }

      setLoading(false);
    };

    fetchUnits();
  }, [buildingId]);

  if (loading) return <p>Loading units...</p>;

  return (
    <section>
      <h2 className="text-xl font-bold mb-4">Units ({units.length})</h2>

      {units.length === 0 ? (
        <div className="p-6 border rounded text-center text-gray-500">
          <p className="text-lg font-medium">No Units Found</p>
          <p>No units have been added to this building yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit) => (
            <div key={unit.id} className="p-4 border rounded shadow-sm hover:shadow-md transition">
              <h3 className="font-semibold text-lg mb-1">Unit {unit.unit_number}</h3>

              {unit.leaseholder_id && unit.leaseholders && unit.leaseholders.length > 0 ? (
                <>
                  <p className="text-sm text-gray-700">{unit.leaseholders[0].name}</p>
                  <p className="text-sm text-gray-500">{unit.leaseholders[0].email}</p>
                  <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                    Occupied
                  </p>
                </>
              ) : (
                <p className="text-sm italic text-gray-400">Unassigned</p>
              )}

                              <Link href={`/buildings/${buildingId}/units/${unit.id}`}>
                <button className="mt-3 text-blue-600 hover:underline text-sm">
                  View Correspondence
                </button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
} 