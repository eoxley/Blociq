import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Home } from 'lucide-react'
import HomePageClient from '@/app/home/HomePageClient'
import PageHero from '@/components/PageHero'

export default async function DashboardHomePage() {
  console.log('🚀 DashboardHomePage: Starting to render...')
  
  const supabase = createClient(cookies())

  try {
    // ✅ STEP 1: USER AUTHENTICATION
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      throw new Error('Authentication failed')
    }
    
    if (!user) {
      console.log('❌ No user found, redirecting to login')
      redirect('/login')
    }

    const userId = user.id
    const userEmail = user.email
    console.log('✅ User authenticated:', userEmail)

    // Get user profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const userData = {
      name: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Property Manager',
      email: user.email || ''
    }

    console.log('🎯 About to render HomePageClient')
    
    return (
      <div className="space-y-6">
        {/* Hero Banner */}
        <PageHero
          title="Dashboard"
          subtitle="Welcome to your property management dashboard"
          icon={<Home className="h-8 w-8 text-white" />}
        />
        
        <HomePageClient userData={userData} />
      </div>
    )

  } catch (error) {
    console.error('❌ Error in DashboardHomePage:', error)
    
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load dashboard</h2>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
} 