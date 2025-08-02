'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import LayoutWithSidebar from '@/components/LayoutWithSidebar';
import PageHero from '@/components/PageHero';
import { Settings } from 'lucide-react';

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  return (
    <LayoutWithSidebar>
      <div className="space-y-8">
        {/* Hero Banner */}
        <PageHero
          title="Account Settings"
          subtitle="Manage your account preferences and settings"
          icon={<Settings className="h-8 w-8 text-white" />}
        />

        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold text-[#0F5D5D]">⚙️ Account Settings</h1>

          {email ? (
            <p className="text-gray-700">Logged in as <strong>{email}</strong></p>
          ) : (
            <p className="text-gray-500">Loading user info...</p>
          )}

          <div className="mt-10 text-sm text-gray-500">
            <p>Coming soon:</p>
            <ul className="mt-2 list-disc list-inside text-left">
              <li>🔄 Switch agency</li>
              <li>📝 Update profile</li>
              <li>🗑️ Delete account</li>
            </ul>
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  );
}
