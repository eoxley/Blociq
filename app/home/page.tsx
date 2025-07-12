import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

export default async function HomePage() {
  const cookieStore = cookies() // 👈 This is now fine — it's already async in 15
  const supabase = createServerComponentClient({ cookies: () => cookieStore })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  return (
    <LayoutWithSidebar>
      <div className="text-[#0F5D5D]">
        <h1 className="text-3xl font-bold mb-6">Welcome to BlocIQ</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/inbox" className="bg-white shadow rounded-xl p-6 hover:shadow-xl transition">Inbox</Link>
          <Link href="/buildings" className="bg-white shadow rounded-xl p-6 hover:shadow-xl transition">Buildings</Link>
          <Link href="/compliance" className="bg-white shadow rounded-xl p-6 hover:shadow-xl transition">Compliance</Link>
        </div>
      </div>
    </LayoutWithSidebar>
  )
}
