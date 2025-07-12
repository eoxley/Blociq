"use client";

import { useEffect, useState } from "react";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadSupabase = async () => {
      const { supabase } = await import("@/utils/supabase");

      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        if (!session) {
          router.push("/login");
        }
      });
      
      setLoading(false);
    };

    loadSupabase();
  }, [router]);

  const handleLogout = async () => {
    const { supabase } = await import("@/utils/supabase");
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Please log in to access this page.</p>
          <button
            onClick={() => router.push("/login")}
            className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-teal-600">BlocIQ</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {session.user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Welcome to BlocIQ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-teal-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-teal-900 mb-2">Dashboard</h3>
              <p className="text-teal-700 mb-4">Access your main dashboard with all your tools.</p>
              <button
                onClick={() => router.push("/dashboard")}
                className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Documents</h3>
              <p className="text-gray-700 mb-4">Manage and organize your documents.</p>
              <button
                onClick={() => router.push("/documents")}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                View Documents
              </button>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Leases</h3>
              <p className="text-gray-700 mb-4">Access your lease management tools.</p>
              <button
                onClick={() => router.push("/leases")}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                View Leases
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}