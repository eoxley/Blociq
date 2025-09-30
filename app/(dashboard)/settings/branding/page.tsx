import { createClient } from '@/lib/supabase/server';
import { BrandingSettingsClient } from './BrandingSettingsClient';

export default async function BrandingSettingsPage() {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-600 mt-2">Please sign in to access settings.</p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', session.user.id)
    .single();

  if (!profile?.agency_id) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-600 mt-2">You must belong to an agency to access branding settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Branding Settings</h1>
        <p className="text-gray-600 mt-2">Customize your agency's primary colour and logo.</p>
      </div>
      <BrandingSettingsClient agencyId={profile.agency_id} />
    </div>
  );
}
