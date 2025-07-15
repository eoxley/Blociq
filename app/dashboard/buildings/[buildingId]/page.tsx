'use client';

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams } from 'next/navigation';
import AIInput from '@/components/AIInput';

export default function BuildingDetailsPage() {
  const supabase = createClientComponentClient();
  const params = useParams();
  const buildingId = params?.buildingId as string;
  const [building, setBuilding] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBuilding = async () => {
      const { data, error } = await supabase
        .from('buildings')
        .select(`
          id,
          name,
          address,
          access_notes,
          service_charge_start,
          service_charge_end,
          upcoming_events,
          upcoming_works
        `)
        .eq('id', buildingId)
        .single();

      if (error) console.error('Error loading building:', error.message);
      else setBuilding(data);

      setLoading(false);
    };

    fetchBuilding();
  }, [buildingId]);

  if (loading || !building) return <p>Loading building...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{building.name}</h1>
      <p className="text-gray-600">{building.address}</p>

      {/* 🔑 Key/Access Info */}
      <section className="bg-gray-100 p-4 rounded shadow-sm">
        <h2 className="text-lg font-semibold mb-1">Access Information</h2>
        <p className="text-sm text-gray-700">{building.access_notes || 'No key info saved yet.'}</p>
      </section>

      {/* 💸 Service Charge Info */}
      <section className="bg-gray-100 p-4 rounded shadow-sm">
        <h2 className="text-lg font-semibold mb-1">Service Charge Period</h2>
        <p className="text-sm text-gray-700">
          {building.service_charge_start
            ? `${building.service_charge_start} to ${building.service_charge_end}`
            : 'Not yet set'}
        </p>
      </section>

      {/* 📅 Events & 🔨 Works */}
      <section className="bg-gray-100 p-4 rounded shadow-sm">
        <h2 className="text-lg font-semibold mb-1">Upcoming Events & Works</h2>
        <p className="text-sm text-gray-700">
          {building.upcoming_events || 'No upcoming events listed.'}
        </p>
        <p className="text-sm text-gray-700 mt-1">
          {building.upcoming_works || 'No planned works at this time.'}
        </p>
      </section>

      {/* 🧠 BlocIQ Summary (AI Panel) */}
      <section className="bg-white p-4 border rounded shadow-sm">
        <h2 className="text-lg font-semibold mb-2">BlocIQ Summary</h2>
        <AIInput context={`Summarise key issues and upcoming obligations for the building ${building.name}.`} />
      </section>
    </div>
  );
} 