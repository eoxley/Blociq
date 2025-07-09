'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <main className="flex flex-col items-center justify-start p-10 text-center space-y-6">
      <h1 className="text-2xl font-bold">⚙️ Account Settings</h1>

      {email ? (
        <p className="text-gray-700">Logged in as <strong>{email}</strong></p>
      ) : (
        <p className="text-gray-500">Loading user info...</p>
      )}

      <button
        onClick={handleLogout}
        className="bg-red-500 text-white px-5 py-2 rounded hover:bg-red-600"
      >
        🔓 Log out
      </button>

      <div className="mt-10 text-sm text-gray-500">
        <p>Coming soon:</p>
        <ul className="mt-2 list-disc list-inside text-left">
          <li>🔄 Switch agency</li>
          <li>📝 Update profile</li>
          <li>🗑️ Delete account</li>
        </ul>
      </div>
    </main>
  );
}
