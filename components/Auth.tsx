"use client"

import { useEffect, useState } from "react"
import { Auth } from "@supabase/auth-ui-react"
import { ThemeSupa } from "@supabase/auth-ui-shared"
import { supabase } from "@/lib/supabase"

export default function AuthUI() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!session) {
    return (
      <div className="max-w-md mx-auto mt-20 p-4 border rounded shadow bg-white">
        <h1 className="text-2xl font-bold mb-4 text-center">🔐 Log in to BlocIQ</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="light"
          providers={[]}
        />
      </div>
    )
  }

  return (
    <div className="text-center mt-20">
      <h2 className="text-xl font-semibold">✅ You're logged in</h2>
      <button
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
        onClick={() => supabase.auth.signOut()}
      >
        Sign Out
      </button>
    </div>
  )
}
