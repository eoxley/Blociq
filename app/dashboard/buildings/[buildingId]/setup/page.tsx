'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Building2, Users, Settings, AlertCircle } from 'lucide-react';
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

interface Building {
  id: number;
  name: string;
  address: string | null;
}

export default function BuildingSetupPage() {
  const supabase = createClientComponentClient();
  const params = useParams();
  const router = useRouter();
  const buildingId = parseInt(params?.buildingId as string);

  const [building, setBuilding] = useState<Building | null>(null);
  const [setup, setSetup] = useState<BuildingSetup>({
    building_id: buildingId,
    structure_type: null,
    operational_notes: null,
    client_type: null,
    client_name: null,
    client_contact: null,
    client_email: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch building details
        const { data: buildingData, error: buildingError } = await supabase
          .from('buildings')
          .select('id, name, address')
          .eq('id', buildingId)
          .single();

        if (buildingError) throw buildingError;
        setBuilding(buildingData);

        // Fetch existing setup data
        const { data: setupData, error: setupError } = await supabase
          .from('building_setup')
          .select('*')
          .eq('building_id', buildingId)
          .single();

        if (setupError && setupError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is fine for new buildings
          console.warn('No existing setup found:', setupError.message);
        } else if (setupData) {
          setSetup(setupData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load building data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [buildingId, supabase]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('building_setup')
        .upsert(setup, { onConflict: 'building_id' });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving setup:', error);
      setError('Failed to save building setup');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof BuildingSetup, value: any) => {
    setSetup(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!building) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Building Not Found</h2>
          <p className="text-gray-600 mb-4">The building you're looking for doesn't exist.</p>
          <Link href="/dashboard/buildings" className="text-teal-600 hover:text-teal-700">
            ← Back to Buildings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href={`/dashboard/buildings/${buildingId}`}
          className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Building Dashboard
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Building Setup</h1>
            <p className="text-lg text-gray-600">{building.name}</p>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-5 w-5 bg-green-400 rounded-full flex items-center justify-center">
                <div className="h-2 w-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Building setup saved successfully!
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Setup Form */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Building Structure Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-600" />
              Building Structure
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Structure Type *
              </label>
              <select
                value={setup.structure_type || ''}
                onChange={(e) => handleInputChange('structure_type', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select structure type...</option>
                <option value="Freehold">Freehold</option>
                <option value="RMC">RMC (Resident Management Company)</option>
                <option value="Tripartite">Tripartite</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Operational Notes
              </label>
              <textarea
                value={setup.operational_notes || ''}
                onChange={(e) => handleInputChange('operational_notes', e.target.value || null)}
                placeholder="Entry codes, meter locations, key access, parking rules, etc."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Client Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              Client Information
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Type *
              </label>
              <select
                value={setup.client_type || ''}
                onChange={(e) => handleInputChange('client_type', e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Select client type...</option>
                <option value="Freeholder Company">Freeholder Company</option>
                <option value="Board of Directors">Board of Directors</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name
              </label>
              <input
                type="text"
                value={setup.client_name || ''}
                onChange={(e) => handleInputChange('client_name', e.target.value || null)}
                placeholder="e.g., Ashwood House RMC Ltd"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person
              </label>
              <input
                type="text"
                value={setup.client_contact || ''}
                onChange={(e) => handleInputChange('client_contact', e.target.value || null)}
                placeholder="e.g., John Smith"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={setup.client_email || ''}
                onChange={(e) => handleInputChange('client_email', e.target.value || null)}
                placeholder="e.g., directors@ashwoodhouse.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Building Setup'}
          </button>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Setup Information</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Structure Type:</strong> Determines how the building is legally structured and managed</li>
          <li>• <strong>Client Type:</strong> Who you report to - either a freeholder company or resident directors</li>
          <li>• <strong>Operational Notes:</strong> Key information for day-to-day management and access</li>
          <li>• This information helps customize communications and compliance tracking for your building</li>
        </ul>
      </div>
    </div>
  );
} 