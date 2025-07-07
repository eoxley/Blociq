"use client";

import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";

export default function LoginPageInner() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // ✅ Dynamically import Supabase *only on the client*
    const loadSupabase = async () => {
      const { supabase } = await import("@/utils/supabase");

      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });
    };

    loadSupabase();
  }, []);

  if (session) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold">You're already signed in.</h2>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Login</h2>
      <p>Add your login form or Supabase Auth UI here.</p>
    </div>
  );
}
