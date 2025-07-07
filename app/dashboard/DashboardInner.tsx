"use client";

import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export default function DashboardInner() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const { supabase } = await import("@/utils/supabase"); // ✅ dynamic import

      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Auth error:", error.message);
      }
      setUser(data?.user ?? null);
      setLoading(false);
    };

    loadUser();
  }, []);

  if (loading) {
    return <p className="p-6">Loading...</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Welcome {user?.email || "guest"} 👋</h1>
      <p className="text-gray-600 mt-2">This is your BlocIQ dashboard.</p>
    </div>
  );
}
