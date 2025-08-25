import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import ComplianceSetupWizard from './ComplianceSetupWizard';

interface ComplianceSetupPageProps {
  params: Promise<{ id: string }>;
}

export default async function BuildingComplianceSetupPage({ params }: ComplianceSetupPageProps) {
  const supabase = createServerComponentClient({ cookies });
  
  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/login');
  }

  // Get buildingId from params
  const { id: buildingId } = await params;
  
  if (!buildingId) {
    redirect('/buildings');
  }

  // Get building information
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', buildingId)
    .single();

  if (buildingError || !building) {
    redirect('/buildings');
  }

  // Check if user has access to this building
  const { data: userBuildings, error: accessError } = await supabase
    .from('building_users')
    .select('building_id')
    .eq('user_id', user.id);

  if (accessError || !userBuildings?.some(ub => ub.building_id === buildingId)) {
    redirect('/buildings');
  }

  // Get existing compliance assets for this building
  const { data: existingAssets, error: assetsError } = await supabase
    .from('building_compliance_assets')
    .select('asset_id')
    .eq('building_id', buildingId);

  const existingAssetIds = existingAssets?.map(asset => asset.asset_id) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <a
              href={`/buildings/${buildingId}/compliance`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Compliance
            </a>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Compliance Setup
          </h1>
          <p className="mt-2 text-gray-600">
            Configure compliance tracking for {building.name}
          </p>
        </div>
        
        <ComplianceSetupWizard 
          buildingId={buildingId}
          buildingName={building.name}
          existingAssetIds={existingAssetIds}
        />
      </div>
    </div>
  );
}
