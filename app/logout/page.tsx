"use client";

import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    const handleLogout = async () => {
      try {
        const { supabase } = await import("@/utils/supabase");
        await supabase.auth.signOut();
        window.location.href = '/login';
      } catch (error) {
        console.error('Error logging out:', error);
        // Still redirect to login even if logout fails
        window.location.href = '/login';
      }
    };

    handleLogout();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">Logging out...</h2>
        <p className="text-gray-600">Please wait while we log you out securely.</p>
        <div className="mt-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}