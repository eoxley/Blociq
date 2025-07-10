'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';
import DashboardNavbar from '@/components/DashboardNavbar';
import DebugUserId from '@/components/DebugUserId';

export default function DashboardPage() {
  const supabase = createClientComponentClient<Database>();
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      setUserName(email?.split('@')[0] || 'User');
    };

    fetchProfile();
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardNavbar />
      <main className="flex-grow p-6 space-y-6">
        <DebugUserId />
        <h1 className="text-3xl font-semibold">Hello, {userName}</h1>

        <div className="bg-white border rounded-xl p-4 shadow-md">
          <p className="text-gray-700">How can I help you today?</p>
          <input
            type="text"
            placeholder="Ask me anything..."
            className="w-full mt-2 p-2 border rounded"
          />
        </div>

        <div className="bg-gray-100 p-3 rounded text-sm text-gray-700">
          📅 Daily update for your buildings will appear here soon.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white shadow p-4">📥 Inbox Preview</div>
          <div className="rounded-xl bg-white shadow p-4">📁 Compliance Summary</div>
          <div className="rounded-xl bg-white shadow p-4">📊 Building Overview</div>
        </div>
      </main>
    </div>
  );
}
