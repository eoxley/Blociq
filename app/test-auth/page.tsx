import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function TestAuthPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      <div className="bg-green-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-green-800">✅ Authentication Working!</h2>
        <p className="text-green-700">User ID: {user.id}</p>
        <p className="text-green-700">Email: {user.email}</p>
        <p className="text-green-700">Session expires: {new Date(user.expires_at || 0).toLocaleString()}</p>
      </div>
      
      <div className="mt-4">
        <a 
          href="/auth/signout" 
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Sign Out
        </a>
      </div>
    </div>
  )
}
