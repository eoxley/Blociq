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

  // Get building compliance assets
  const { data: complianceAssets, error: assetsError } = await supabase
    .from('building_compliance_assets')
    .select(`
      *,
      compliance_documents (
        id,
        title,
        document_type,
        file_url,
        file_name,
        uploaded_at,
        notes
      )
    `)
    .eq('building_id', params.id)
    .order('priority', { ascending: false });

  if (assetsError) {
    console.error('Error fetching compliance assets:', assetsError);
    // Don't redirect, just show empty state
  }

  // Get compliance documents count
  const { data: documentsCount, error: docsError } = await supabase
    .from('compliance_documents')
    .select('id', { count: 'exact' })
    .eq('building_id', params.id);

  const totalDocuments = documentsCount || 0;

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
                {building.name} - Real-time compliance monitoring
              </p>
            </div>
            
            <div className="flex space-x-3">
              <a
                href={`/buildings/compliance/setup?buildingId=${params.id}`}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Setup Compliance
              </a>
              <a
                href={`/buildings/${params.id}/compliance/reports`}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Generate Reports
              </a>
            </div>
          </div>
        </div>
        
        <BuildingComplianceDashboard 
          buildingId={params.id}
          buildingName={building.name}
          complianceAssets={complianceAssets || []}
          totalDocuments={totalDocuments}
        />
      </div>
    </div>
  );
}
