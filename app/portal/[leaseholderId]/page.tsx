import { createClient } from '@/lib/supabase/server';
import { DashboardSnapshot } from './components/DashboardSnapshot';
import { RecentCommunications } from './components/RecentCommunications';
import { UpcomingItems } from './components/UpcomingItems';
import { QuickActions } from './components/QuickActions';

interface PortalDashboardProps {
  params: { leaseholderId: string };
}

export default async function PortalDashboard({ params }: PortalDashboardProps) {
  const supabase = await createClient();

  // Get lease information
  const { data: lease } = await supabase
    .from('leases')
    .select(`
      *,
      buildings!inner(id, name, address),
      units(id, unit_number, floor)
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
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {lease.leaseholder_name || 'Leaseholder'}
        </h1>
        <p className="text-gray-600 mt-2">
          Here's an overview of your {lease.scope === 'unit' ? 'unit' : 'building'} information and recent activity.
        </p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Snapshot Cards */}
        <div className="lg:col-span-2">
          <DashboardSnapshot lease={lease} />
        </div>

        {/* Recent Communications */}
        <RecentCommunications leaseholderId={params.leaseholderId} />

        {/* Upcoming Items */}
        <UpcomingItems leaseholderId={params.leaseholderId} />

        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <QuickActions leaseholderId={params.leaseholderId} scope={lease.scope} />
        </div>
      </div>
    </div>
  );
}