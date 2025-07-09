'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center p-10 space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Login to BlocIQ</h1>

      {sent ? (
        <p className="text-green-600">✅ Magic link sent! Check your email.</p>
      ) : (
        <>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-2 border rounded w-64"
          />
          <button
            onClick={handleLogin}
            className="bg-[#0F5D5D] text-white px-6 py-2 rounded hover:opacity-90"
          >
            Send Magic Link
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </>
      )}
    </main>
  );
}
