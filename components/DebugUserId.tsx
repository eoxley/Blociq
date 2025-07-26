'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function DebugUserId() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
      console.log('👉 SESSION USER ID:', session?.user?.id);
    };

    getSession();
  }, []);

  return userId ? (
    <div className="p-2 text-sm text-gray-600 border border-dashed rounded bg-white mb-4">
      <strong>Debug User ID:</strong> {userId}
    </div>
  ) : null;
}
