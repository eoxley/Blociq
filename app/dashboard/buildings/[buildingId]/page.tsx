'use client';

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams } from 'next/navigation';
import { Shield, Building, Calendar, Wrench, Brain } from 'lucide-react';
import Link from 'next/link';
import AIInput from '../../../../components/AIInput';
import BuildingSummaryPanel from '../../../../components/BuildingSummaryPanel';
import BuildingEvents from '../../../../components/BuildingEvents';

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{building.name}</h1>
          <p className="text-gray-600">{building.address}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/buildings/${buildingId}/compliance/tracker`}
            className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Shield className="h-4 w-4 mr-2" />
            Compliance Tracker
          </Link>
        </div>
      </div>

      {/* Building Summary Panel */}
      <BuildingSummaryPanel 
        buildingId={parseInt(buildingId)} 
        buildingName={building.name} 
        buildingAddress={building.address} 
      />

      {/* Building Events */}
      <BuildingEvents 
        buildingId={parseInt(buildingId)} 
        buildingName={building.name} 
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href={`/dashboard/buildings/${buildingId}/compliance/tracker`}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center">
            <div className="p-2 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition-colors">
              <Shield className="h-6 w-6 text-teal-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">Compliance</h3>
              <p className="text-sm text-gray-600">Track requirements</p>
            </div>
          </div>
        </Link>

        <Link
          href={`/buildings/${buildingId}`}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">Building Details</h3>
              <p className="text-sm text-gray-600">View full details</p>
            </div>
          </div>
        </Link>

        <Link
          href={`/buildings/${buildingId}/major-works`}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
              <Wrench className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">Major Works</h3>
              <p className="text-sm text-gray-600">Track projects</p>
            </div>
          </div>
        </Link>

        <Link
          href={`/buildings/${buildingId}/units`}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-gray-900">Units</h3>
              <p className="text-sm text-gray-600">Manage units</p>
            </div>
          </div>
        </Link>
      </div>

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
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-5 w-5 text-teal-600" />
          <h2 className="text-lg font-semibold">BlocIQ Summary</h2>
        </div>
        <AIInput buildingId={buildingId} context={`Summarise key issues and upcoming obligations for the building ${building.name}.`} />
      </section>
    </div>
  );
} 