'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import BlocIQLogo from '@/components/BlocIQLogo';
import PageHero from '@/components/PageHero';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [returnUrl, setReturnUrl] = useState('/home');

  // Extract returnUrl from URL params and add CSS animation
  useEffect(() => {
    // Get returnUrl from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const returnUrlParam = urlParams.get('returnUrl');
    if (returnUrlParam) {
      setReturnUrl(decodeURIComponent(returnUrlParam));
    }
    
    // Add CSS animation for fade-in effect
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in {
        animation: fadeIn 0.6s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const handleLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
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
        console.log('🔄 Redirecting to:', returnUrl);

        // ✅ Step 3: redirect to returnUrl or default to home
        window.location.href = returnUrl;
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageHero title="Login to BlocIQ" subtitle="Sign in to access your property management dashboard." icon={<BlocIQLogo className="text-white" size={28} />} />
      <main className="flex flex-col items-center justify-center py-20 px-6 space-y-8 text-center bg-gradient-to-b from-gray-50 to-white min-h-screen relative overflow-hidden">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#4f46e5]/5 to-[#a855f7]/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#14b8a6]/5 to-[#3b82f6]/5 rounded-full blur-3xl"></div>
        </div>
        {/* Enhanced Login Form Container */}
        <div className="w-full max-w-md mx-auto animate-fade-in">
          {/* Form Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome Back</h1>
            <p className="text-lg text-gray-600 leading-relaxed">Sign in to access your property management dashboard</p>
          </div>

          {/* Enhanced Login Form */}
          <div className="bg-white rounded-2xl p-8 shadow-2xl border border-gray-100">
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }} onKeyDown={(e) => { if (e.key === 'Enter' && !isLoading) handleLogin(); }}>
              {/* Email Input */}
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 text-left">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all duration-200 text-base shadow-sm hover:border-gray-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 text-left">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent transition-all duration-200 text-base shadow-sm hover:border-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#4f46e5] to-[#a855f7] hover:brightness-110 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  'Sign In to BlocIQ'
                )}
              </button>
            </form>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Need help? Contact{' '}
                <a href="mailto:hello@blociq.co.uk" className="text-[#4f46e5] hover:text-[#a855f7] font-medium transition-colors">
                  hello@blociq.co.uk
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
