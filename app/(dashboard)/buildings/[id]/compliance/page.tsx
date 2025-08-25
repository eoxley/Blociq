import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import BuildingComplianceDashboard from './BuildingComplianceDashboard';

interface BuildingCompliancePageProps {
  params: {
    id: string;
  };
}

export default async function BuildingCompliancePage({ params }: BuildingCompliancePageProps) {
  const supabase = createServerComponentClient({ cookies });
  
  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/login');
  }

  // Get building information
  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', params.id)
    .single();

  if (buildingError || !building) {
    redirect('/buildings');
  }

  // Check if user has access to this building
  const { data: userBuildings, error: accessError } = await supabase
    .from('building_users')
    .select('building_id')
    .eq('user_id', user.id);

  if (accessError || !userBuildings?.some(ub => ub.building_id === params.id)) {
    redirect('/buildings');
  }

  // Check if this building has any compliance assets set up
  const { data: existingAssets, error: assetsCheckError } = await supabase
    .from('building_compliance_assets')
    .select('id')
    .eq('building_id', params.id)
    .limit(1);

  if (assetsCheckError) {
    console.error('Error checking existing assets:', assetsCheckError);
  }

  // If no assets are set up, show the setup page instead
  if (!existingAssets || existingAssets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Compliance Setup
                </h1>
                <p className="mt-2 text-gray-600">
                  {building.name} - Set up your compliance tracking
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Compliance Assets Configured
            </h3>
            <p className="text-gray-600 mb-6">
              This building doesn't have any compliance assets set up yet. 
              You'll need to configure which compliance items to track for this building.
            </p>
            <a
              href={`/buildings/${params.id}/compliance/setup`}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Setup Compliance Assets
            </a>
          </div>
        </div>
      </div>
    );
  }

  // If assets exist, fetch the full data and show the dashboard
  let complianceAssets: any[] = [];
  let totalDocuments = 0;

  try {
    // Get building compliance assets from the existing table
    const { data: assets, error: assetsError } = await supabase
      .from('building_compliance_assets')
      .select(`
        id,
        asset_id,
        status,
        priority,
        due_date,
        last_completed,
        next_due,
        assigned_to,
        notes,
        created_at,
        updated_at,
        compliance_assets (
          id,
          name,
          category,
          description,
          frequency_months,
          frequency
        )
      `)
      .eq('building_id', params.id);

    if (assetsError) {
      console.error('Error fetching compliance assets:', assetsError);
    } else {
      complianceAssets = assets || [];
    }

    // Get compliance documents count
    const { data: documents, error: docsError } = await supabase
      .from('compliance_documents')
      .select('id')
      .eq('building_id', params.id);

    if (docsError) {
      console.error('Error fetching compliance documents:', docsError);
    } else {
      totalDocuments = documents?.length || 0;
    }

  } catch (error) {
    console.error('Error in compliance data fetch:', error);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Compliance Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                {building.name} - Monitor and manage compliance requirements
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/buildings/${params.id}/compliance/setup`}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Setup Compliance Assets
              </a>
            </div>
          </div>
        </div>
        
        <BuildingComplianceDashboard 
          buildingId={params.id}
          buildingName={building.name}
          complianceAssets={complianceAssets}
          totalDocuments={totalDocuments}
        />
      </div>
    </div>
  );
}
