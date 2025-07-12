'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function Sidebar() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="min-h-screen w-64 bg-[#0F5D5D] text-white flex flex-col py-8 px-6">
      <h1 className="text-2xl font-bold mb-10 font-serif">BlocIQ</h1>
      <nav className="space-y-4 flex-1">
        <a href="/home" className="block px-4 py-2 rounded-lg text-lg hover:bg-[#1a4d4d]">Home</a>
        <a href="/inbox" className="block px-4 py-2 rounded-lg text-lg hover:bg-[#1a4d4d]">Inbox</a>
        <a href="/buildings" className="block px-4 py-2 rounded-lg text-lg hover:bg-[#1a4d4d]">Buildings</a>
        <a href="/compliance" className="block px-4 py-2 rounded-lg text-lg hover:bg-[#1a4d4d]">Compliance</a>
      </nav>
      <button
        onClick={handleLogout}
        className="mt-auto px-4 py-2 rounded-lg text-lg hover:bg-[#1a4d4d] text-left w-full"
      >
        Logout
      </button>
    </aside>
  )
}
