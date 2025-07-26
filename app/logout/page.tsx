'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.signOut().then(() => {
      router.push('/login')
    })
  }, [router])

  return <p className="p-10 text-[#0F5D5D]">Logging out...</p>
}
