'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      // ✅ Manual, controlled redirect
      window.location.href = '/dashboard';
    }
  };

  return (
    <main className="flex flex-col items-center justify-center p-10 space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Login to BlocIQ</h1>

      <input
        type="email"
        placeholder="Email"
        className="border p-2 rounded w-full max-w-sm"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="border p-2 rounded w-full max-w-sm"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleLogin}
        className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
      >
        Sign In
      </button>

      {error && <p className="text-red-500">{error}</p>}
    </main>
  );
}
