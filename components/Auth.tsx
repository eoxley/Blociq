"use client";

import { useAuth } from "@/lib/auth/client";

export default function Auth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold">Please sign in</h2>
        <p className="text-gray-600 mt-2">You need to be signed in to access this content.</p>
      </div>
    );
  }

  return <>{children}</>;
}
