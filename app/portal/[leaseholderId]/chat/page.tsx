import { createClient } from '@/lib/supabase/server';
import { LeaseholderChatClient } from './LeaseholderChatClient';

interface ChatPageProps {
  params: { leaseholderId: string };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const supabase = await createClient();

  // Get lease and building information for context
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Ask BlocAI</h1>
        <p className="text-gray-600 mt-2">
          Get instant answers about your lease, building, and property management.
        </p>
      </div>

      {/* Chat Interface */}
      <LeaseholderChatClient 
        leaseholderId={params.leaseholderId}
        leaseContext={{
          id: lease.id,
          leaseholderName: lease.leaseholder_name,
          unitNumber: lease.unit_number,
          buildingId: lease.building_id,
          buildingName: lease.buildings.name,
          buildingAddress: lease.buildings.address,
          groundRent: lease.ground_rent,
          serviceChargePercentage: lease.service_charge_percentage
        }}
      />
    </div>
  );
}
