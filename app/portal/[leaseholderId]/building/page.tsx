import { createClient } from '@/lib/supabase/server';
import { BuildingInfo } from './components/BuildingInfo';
import { ComplianceStatus } from './components/ComplianceStatus';
import { MajorWorks } from './components/MajorWorks';
import { DocumentLibrary } from './components/DocumentLibrary';
import { MaintenanceHistory } from './components/MaintenanceHistory';

interface BuildingPageProps {
  params: { leaseholderId: string };
}

export default async function BuildingPage({ params }: BuildingPageProps) {
  const supabase = await createClient();

  // Get lease and building information
  const { data: lease } = await supabase
    .from('leases')
    .select(`
      id,
      leaseholder_name,
      building_id,
      unit_number,
      status,
      start_date,
      end_date,
      ground_rent,
      service_charge_percentage,
      buildings!inner(
        id,
        name,
        address,
        total_units,
        year_built,
        building_type,
        managed_by,
        insurance_details,
        freeholder_name,
        freeholder_contact
      )
    `)
    .eq('id', params.leaseholderId)
    .single();

  if (!lease) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Lease not found</h2>
        <p className="text-gray-600 mt-2">The requested lease could not be found.</p>
      </div>
    );
  }

  const pageTitle = `Unit ${lease.unit_number || 'Overview'}`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
        <p className="text-gray-600 mt-2">
          Information about your unit and the building at {lease.buildings.address || lease.buildings.name}
        </p>
      </div>

      {/* Building/Unit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Building Information */}
        <div className="lg:col-span-2">
          <BuildingInfo
            building={lease.buildings}
            unit={{ unit_number: lease.unit_number }}
            scope="unit"
          />
        </div>

        {/* Compliance Status */}
        <ComplianceStatus buildingId={lease.building_id} />

        {/* Major Works */}
        <MajorWorks buildingId={lease.building_id} />

        {/* Document Library */}
        <div className="lg:col-span-2">
          <DocumentLibrary leaseholderId={params.leaseholderId} />
        </div>

        {/* Maintenance History */}
        <div className="lg:col-span-2">
          <MaintenanceHistory buildingId={lease.building_id} scope="unit" unitId={null} />
        </div>
      </div>
    </div>
  );
}