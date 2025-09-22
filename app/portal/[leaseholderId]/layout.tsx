import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PortalNavigation } from './components/PortalNavigation';
import { PortalHeader } from './components/PortalHeader';

interface PortalLayoutProps {
  children: React.ReactNode;
  params: { leaseholderId: string };
}

export default async function PortalLayout({
  children,
  params
}: PortalLayoutProps) {
  const supabase = await createClient();

  // Get current user session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (!session?.user) {
    // Redirect to login - this will be handled by middleware
    return null;
  }

  // Verify user has access to this leaseholder portal
  const { data: lease, error: leaseError } = await supabase
    .from('leases')
    .select(`
      id,
      leaseholder_name,
      building_id,
      unit_number,
      status,
      start_date,
      end_date,
      buildings!inner(id, name, address)
    `)
    .eq('id', params.leaseholderId)
    .single();

  if (leaseError || !lease) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You do not have permission to access this leaseholder portal.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalHeader
        leaseholderName={lease.leaseholder_name}
        buildingName={lease.buildings.name}
        unitNumber={lease.unit_number}
        scope="unit"
      />

      <div className="flex">
        <PortalNavigation
          leaseholderId={params.leaseholderId}
          scope="unit"
        />

        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}