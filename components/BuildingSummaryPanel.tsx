'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Building2, Users, Settings, Edit, Info, MapPin } from 'lucide-react';
import Link from 'next/link';

interface BuildingSetup {
  id?: number;
  building_id: number;
  structure_type: 'Freehold' | 'RMC' | 'Tripartite' | null;
  operational_notes: string | null;
  client_type: 'Freeholder Company' | 'Board of Directors' | null;
  client_name: string | null;
  client_contact: string | null;
  client_email: string | null;
  created_at?: string;
  updated_at?: string;
}

interface BuildingSummaryPanelProps {
  buildingId: number;
  buildingName: string;
  buildingAddress?: string | null;
}

export default function BuildingSummaryPanel({ 
  buildingId, 
  buildingName, 
  buildingAddress 
}: BuildingSummaryPanelProps) {
  const supabase = createClientComponentClient();
  const [setup, setSetup] = useState<BuildingSetup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSetup = async () => {
      try {
        const { data, error } = await supabase
          .from('building_setup')
          .select('*')
          .eq('building_id', buildingId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.warn('Error fetching building setup:', error.message);
        } else if (data) {
          setSetup(data);
        }
      } catch (error) {
        console.error('Error fetching building setup:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSetup();
  }, [buildingId, supabase]);

  const getStructureTypeColor = (type: string | null) => {
    switch (type) {
      case 'Freehold':
        return 'bg-blue-100 text-blue-800';
      case 'RMC':
        return 'bg-green-100 text-green-800';
      case 'Tripartite':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getClientTypeColor = (type: string | null) => {
    switch (type) {
      case 'Freeholder Company':
        return 'bg-orange-100 text-orange-800';
      case 'Board of Directors':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  const hasSetup = setup && (setup.structure_type || setup.client_type || setup.operational_notes);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-teal-600" />
          Building Summary
        </h2>
        <Link
          href={`/buildings/${buildingId}/setup`}
          className="inline-flex items-center px-3 py-1.5 text-sm bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 transition-colors"
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit Setup
        </Link>
      </div>

      {!hasSetup ? (
        <div className="text-center py-8">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Setup Required</h3>
          <p className="text-gray-600 mb-4">
            Complete the building setup to customise communications and compliance tracking.
          </p>
          <Link
            href={`/buildings/${buildingId}/setup`}
            className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            Complete Setup
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Structure Type */}
          {setup.structure_type && (
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm text-gray-600">Structure:</span>
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStructureTypeColor(setup.structure_type)}`}>
                  {setup.structure_type}
                </span>
              </div>
            </div>
          )}

          {/* Client Information */}
          {setup.client_type && (
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm text-gray-600">Client:</span>
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getClientTypeColor(setup.client_type)}`}>
                  {setup.client_type}
                </span>
                {setup.client_name && (
                  <span className="ml-2 text-sm text-gray-900">({setup.client_name})</span>
                )}
              </div>
            </div>
          )}

          {/* Contact Information */}
          {(setup.client_contact || setup.client_email) && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                {setup.client_contact && (
                  <div className="text-gray-900 mb-1">
                    <span className="text-gray-600">Contact:</span> {setup.client_contact}
                  </div>
                )}
                {setup.client_email && (
                  <div className="text-gray-900">
                    <span className="text-gray-600">Email:</span> {setup.client_email}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Operational Notes */}
          {setup.operational_notes && (
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm text-gray-600">Operational Notes:</span>
                <p className="text-sm text-gray-900 mt-1 whitespace-pre-line">
                  {setup.operational_notes}
                </p>
              </div>
            </div>
          )}

          {/* Last Updated */}
          {setup.updated_at && (
            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Last updated: {new Date(setup.updated_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 