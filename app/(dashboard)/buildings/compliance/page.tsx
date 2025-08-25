import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import PortfolioComplianceOverview from './PortfolioComplianceOverview';

export default async function PortfolioCompliancePage() {
  const supabase = createServerComponentClient({ cookies });
  
  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/login');
  }

  // Get all buildings the user has access to
  const { data: userBuildings, error: accessError } = await supabase
    .from('building_users')
    .select(`
      building_id,
      buildings (
        id,
        name,
        address,
        created_at
      )
    `)
    .eq('user_id', user.id);

  if (accessError || !userBuildings) {
    redirect('/buildings');
  }

  const buildingIds = userBuildings.map(ub => ub.building_id);
  
  if (buildingIds.length === 0) {
    redirect('/buildings');
  }

  // Get compliance data for all buildings
  const { data: complianceData, error: complianceError } = await supabase
    .from('building_compliance_assets')
    .select(`
      id,
      building_id,
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
      buildings (
        id,
        name,
        address
      )
    `)
    .in('building_id', buildingIds);

  if (complianceError) {
    console.error('Error fetching compliance data:', complianceError);
    // Don't redirect, just show empty state
  }

  // Get compliance documents count for all buildings
  const { data: documentsData, error: docsError } = await supabase
    .from('compliance_documents')
    .select('building_id, id')
    .in('building_id', buildingIds);

  if (docsError) {
    console.error('Error fetching documents data:', docsError);
  }

  // Process the data for the component
  const buildings = userBuildings.map(ub => ({
    ...ub.buildings,
    compliance_assets: complianceData?.filter(ca => ca.building_id === ub.building_id) || [],
    document_count: documentsData?.filter(doc => doc.building_id === ub.building_id).length || 0
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Portfolio Industry Knowledge Overview
          </h1>
          <p className="mt-2 text-gray-600">
            Monitor industry knowledge status across all your buildings
          </p>
        </div>
        
        <PortfolioComplianceOverview 
          buildings={buildings}
          userId={user.id}
        />
      </div>
    </div>
  );
}
