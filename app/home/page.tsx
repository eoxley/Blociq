import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return (
    <main className="p-10 text-[#0F5D5D]">
      <h1 className="text-3xl font-bold mb-6">Welcome to BlocIQ</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/inbox" className="bg-white shadow rounded-xl p-6 hover:shadow-xl transition">Inbox</Link>
        <Link href="/buildings" className="bg-white shadow rounded-xl p-6 hover:shadow-xl transition">Buildings</Link>
        <Link href="/compliance" className="bg-white shadow rounded-xl p-6 hover:shadow-xl transition">Compliance</Link>
      </div>
    </main>
  )
}
