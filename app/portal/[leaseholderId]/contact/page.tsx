import { createClient } from '@/lib/supabase/server';
import { ContactFormClient } from './ContactFormClient';

interface ContactPageProps {
  params: { leaseholderId: string };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const supabase = await createClient();

  // Get lease and building information
  const { data: lease } = await supabase
    .from('leases')
    .select(`
      id,
      leaseholder_name,
      building_id,
      unit_number,
      buildings!inner(
        id,
        name,
        address,
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

  // Get recent communications for context
  const { data: recentCommunications } = await supabase
    .from('communications_log')
    .select(`
      id,
      type,
      subject,
      sent_at,
      status
    `)
    .eq('building_id', lease.building_id)
    .order('sent_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Contact & Support</h1>
        <p className="text-gray-600 mt-2">
          Get in touch with your building management team or report issues.
        </p>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Building Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Property Manager</h3>
            <p className="text-gray-600">
              {lease.buildings.managed_by || 'Not specified'}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Freeholder</h3>
            <p className="text-gray-600">
              {lease.buildings.freeholder_name || 'Not specified'}
            </p>
            {lease.buildings.freeholder_contact && (
              <p className="text-sm text-gray-500 mt-1">
                Contact: {lease.buildings.freeholder_contact}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <ContactFormClient 
        leaseholderId={params.leaseholderId}
        leaseContext={{
          leaseholderName: lease.leaseholder_name,
          unitNumber: lease.unit_number,
          buildingId: lease.building_id,
          buildingName: lease.buildings.name
        }}
        recentCommunications={recentCommunications || []}
      />
    </div>
  );
}
