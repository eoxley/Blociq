import { createClient } from '@/lib/supabase/server';
import { CommunicationsHistory } from './components/CommunicationsHistory';
import { FinancialOverview } from './components/FinancialOverview';
import { LeaseDetails } from './components/LeaseDetails';
import { AccountSettings } from './components/AccountSettings';

interface AccountPageProps {
  params: { leaseholderId: string };
}

export default async function AccountPage({ params }: AccountPageProps) {
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
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
        <p className="text-gray-600 mt-2">
          Manage your lease details, communications, and financial information.
        </p>
      </div>

      {/* Account Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lease Details */}
        <div className="lg:col-span-2">
          <LeaseDetails lease={lease} />
        </div>

        {/* Financial Overview */}
        <FinancialOverview leaseholderId={params.leaseholderId} />

        {/* Communications History */}
        <CommunicationsHistory leaseholderId={params.leaseholderId} />

        {/* Account Settings */}
        <div className="lg:col-span-2">
          <AccountSettings lease={lease} />
        </div>
      </div>
    </div>
  );
}