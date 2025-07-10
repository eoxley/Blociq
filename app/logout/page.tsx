'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LogoutPage() {
  const supabase = createClientComponentClient();

  useEffect(() => {
    const logout = async () => {
      await supabase.auth.signOut();
      window.location.href = '/login'; // redirect after logout
    };

    logout();
  }, []);

  return <p className="text-center p-4">Logging you out…</p>;
}
