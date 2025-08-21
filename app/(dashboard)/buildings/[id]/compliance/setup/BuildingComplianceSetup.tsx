'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Shield, Save, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card';
import { BlocIQBadge } from '@/components/ui/blociq-badge';
import { BlocIQButton } from '@/components/ui/blociq-button';

interface ComplianceAsset {
  id: string;
  name: string;
  category: string;
  description?: string;
  frequency?: string;
}

interface BuildingComplianceSetupProps {
  buildingId: string;
  buildingName?: string;
}

export default function BuildingComplianceSetup({ buildingId, buildingName }: BuildingComplianceSetupProps) {
  const [masterAssets, setMasterAssets] = useState<ComplianceAsset[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('compliance_assets')
          .select('*')
          .order('category')
          .order('name');

        if (error) {
          console.error('Error fetching compliance assets:', error);
          setError('Failed to load compliance assets');
          return;
        }

        setMasterAssets(data || []);
      } catch (err) {
        console.error('Unexpected error fetching assets:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [supabase]);

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const save = async () => {
    if (selected.length === 0) return;

    setSaving(true);
    setSaveStatus('idle');

    try {
      // Prepare the data for insertion
      const rows = selected.map(asset_id => ({
        building_id: buildingId,
        asset_id: asset_id, // Using asset_id to match existing schema
        status: 'active', // Using 'active' to match existing schema
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('building_compliance_assets')
        .upsert(rows, { onConflict: 'building_id,asset_id' });

      if (error) {
        console.error('Error saving compliance assets:', error);
        setSaveStatus('error');
        throw new Error(`Failed to save: ${error.message}`);
      }

      setSaveStatus('success');
      
      // Redirect to compliance tracker after a short delay
      setTimeout(() => {
        window.location.href = `/buildings/${buildingId}/compliance`;
      }, 2000);

    } catch (err) {
      console.error('Error in save operation:', err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // Group assets by category for better organization
  const groupedAssets = masterAssets.reduce((acc, asset) => {
    const category = asset.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(asset);
    return acc;
  }, {} as Record<string, ComplianceAsset[]>);

  const getStatusIcon = () => {
    switch (saveStatus) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Shield className="h-5 w-5 text-blue-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (saveStatus) {
      case 'success':
        return 'Compliance assets saved successfully! Redirecting to compliance tracker...';
      case 'error':
        return 'Failed to save compliance assets. Please try again.';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <div className="w-16 h-16 bg-[#2BBEB4] rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
            Loading Compliance Assets
          </h2>
          <p className="text-[#64748B] text-center">
            Please wait while we load the available compliance requirements...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4 text-center">
            Error Loading Assets
          </h2>
          <p className="text-[#64748B] text-center mb-6">
            {error}
          </p>
          <BlocIQButton
            variant="primary"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Try Again
          </BlocIQButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-serif font-bold">Assign Compliance Assets</h1>
                {buildingName && (
                  <p className="text-white/90 text-lg">{buildingName}</p>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{selected.length}</div>
            <div className="text-white/80 text-sm">Selected</div>
          </div>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus !== 'idle' && (
        <BlocIQCard variant="elevated">
          <BlocIQCardContent>
            <div className={`flex items-center gap-3 p-4 rounded-xl ${
              saveStatus === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              {getStatusIcon()}
              <div>
                <p className={`font-semibold ${
                  saveStatus === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {saveStatus === 'success' ? 'Success!' : 'Error'}
                </p>
                <p className={`text-sm ${
                  saveStatus === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {getStatusMessage()}
                </p>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      )}

      {/* Instructions */}
      <BlocIQCard variant="elevated">
        <BlocIQCardContent>
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-[#2BBEB4] rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#333333] mb-3">
              Select Compliance Requirements
            </h2>
            <p className="text-[#64748B] max-w-2xl mx-auto">
              Choose the compliance assets that apply to this building. 
              These will be tracked in your compliance dashboard.
            </p>
          </div>
        </BlocIQCardContent>
      </BlocIQCard>

      {/* Compliance Assets Grid */}
      {Object.keys(groupedAssets).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedAssets).map(([category, assets]) => (
            <BlocIQCard key={category} variant="elevated">
              <BlocIQCardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-serif font-semibold text-[#333333]">
                      {category}
                    </h2>
                    <p className="text-sm text-[#64748B]">
                      {assets.length} compliance requirements
                    </p>
                  </div>
                  <BlocIQBadge variant="secondary" className="bg-gray-100 text-gray-700">
                    {assets.filter(asset => selected.includes(asset.id)).length} of {assets.length} selected
                  </BlocIQBadge>
                </div>
              </BlocIQCardHeader>
              
              <BlocIQCardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assets.map(asset => (
                    <div
                      key={asset.id}
                      onClick={() => toggle(asset.id)}
                      className={`p-6 rounded-xl cursor-pointer border-2 transition-all duration-200 hover:shadow-lg ${
                        selected.includes(asset.id) 
                          ? 'border-[#008C8F] bg-gradient-to-r from-[#F0FDFA] to-emerald-50' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-serif font-semibold text-[#333333] leading-tight">
                          {asset.title}
                        </h3>
                        {selected.includes(asset.id) && (
                          <CheckCircle className="h-5 w-5 text-[#008C8F] flex-shrink-0" />
                        )}
                      </div>
                      
                      {asset.description && (
                        <p className="text-sm text-[#64748B] mb-3 leading-relaxed">
                          {asset.description}
                        </p>
                      )}
                      
                      {asset.frequency && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#64748B]" />
                          <BlocIQBadge variant="secondary" size="sm">
                            {asset.frequency}
                          </BlocIQBadge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </BlocIQCardContent>
            </BlocIQCard>
          ))}
        </div>
      ) : (
        <BlocIQCard variant="elevated">
          <BlocIQCardContent>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[#2BBEB4] rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#333333] mb-4">
                No Compliance Assets Available
              </h2>
              <p className="text-[#64748B] mb-6 max-w-md mx-auto">
                No compliance assets have been configured in the system. Please contact your administrator.
              </p>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      )}

      {/* Save Button */}
      <BlocIQCard variant="elevated">
        <BlocIQCardContent>
          <div className="text-center py-6">
            <h3 className="text-xl font-serif font-semibold text-[#333333] mb-4">
              Ready to Save Compliance Assets?
            </h3>
            <p className="text-[#64748B] mb-6">
              {selected.length > 0 
                ? `You have selected ${selected.length} compliance requirements. Click save to continue.`
                : 'Please select at least one compliance requirement to continue.'
              }
            </p>
            <BlocIQButton
              variant="primary"
              onClick={save}
              disabled={saving || selected.length === 0}
              className="w-full bg-gradient-to-r from-[#008C8F] to-[#2BBEB4] hover:from-[#007B8A] hover:to-[#2BBEB4] text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save & Continue
                </>
              )}
            </BlocIQButton>
          </div>
        </BlocIQCardContent>
      </BlocIQCard>
    </div>
  );
} 