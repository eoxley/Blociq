"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import UploadClean from "@/components/UploadClean"

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error("Auth error:", error.message)
      }
      setUser(user)
      setLoading(false)
    }

    getUser()
  }, [])

  if (loading) {
    return (
      <div className="text-center mt-10 text-lg">⏳ Loading dashboard...</div>
    )
  }

  if (!user) {
    return (
      <div className="text-center mt-10">
        <h2 className="text-xl font-semibold">🔐 Please log in to access the dashboard</h2>
        <p className="mt-2">You can log in at <code>/login</code></p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📁 Upload Compliance Documents</h1>
      <UploadClean />
    </div>
  )
}
