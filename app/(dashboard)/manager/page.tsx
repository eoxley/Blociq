import { createClient } from '@/lib/supabase/server';
import { ManagerDashboardClient } from './ManagerDashboardClient';

export default async function ManagerDashboard() {
  const supabase = await createClient();

  // Get current user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-600 mt-2">Please sign in to access the manager dashboard.</p>
      </div>
    );
  }

  // Get user's agency and buildings
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id,
      role,
      agency_id,
      agencies!inner (
        id,
        name
      )
    `)
    .eq('id', session.user.id)
    .single();

  if (!profile || !['manager', 'director'].includes(profile.role)) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-600 mt-2">You don't have permission to access the manager dashboard.</p>
      </div>
    );
  }

  // Get buildings for the agency
  const { data: buildings } = await supabase
    .from('buildings')
    .select(`
      id,
      name,
      address,
      total_units
    `)
    .eq('agency_id', profile.agency_id)
    .order('name');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {profile.agencies?.name || 'Manager'}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {buildings?.length || 0} building{(buildings?.length || 0) !== 1 ? 's' : ''} managed
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <ManagerDashboardClient 
        buildings={buildings || []}
        userRole={profile.role}
      />
    </div>
  );
}
