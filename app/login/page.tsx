'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import BlocIQLogo from '@/components/BlocIQLogo';
import PageHero from '@/components/PageHero';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);

    // 🔥 Step 1: kill any stale session
    await supabase.auth.signOut();

    // ✅ Step 2: clean login attempt
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log('✅ Logged-in user ID:', session?.user?.id);

      // ✅ Step 3: manual redirect to home
      window.location.href = '/home';
    }
  };

  return (
    <>
      <PageHero title="Login to BlocIQ" subtitle="Sign in to access your property management dashboard." icon={<BlocIQLogo className="text-white" size={28} />} />
      <main className="flex flex-col items-center justify-center p-10 space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Login to BlocIQ</h1>

        <input
          type="email"
          placeholder="Email"
          className="border border-gray-300 p-3 rounded-xl w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="border border-gray-300 p-3 rounded-xl w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          Sign In
        </button>

        {error && <p className="text-red-500">{error}</p>}
      </main>
    </>
  );
}
