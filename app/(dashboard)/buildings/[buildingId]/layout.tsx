import { ReactNode } from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface BuildingLayoutProps {
  children: ReactNode
  params: {
    buildingId: string
  }
}

export default async function BuildingLayout({ 
  children, 
  params 
}: BuildingLayoutProps) {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  // Get building name
  let buildingName = ''
  try {
    const { data: building } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', params.buildingId)
      .single()
    
    if (building) {
      buildingName = building.name
    }
  } catch (error) {
    console.warn('Could not fetch building name:', error)
  }

  return (
    <div className="space-y-6">
      {/* Building Header */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] text-white px-6 py-4 rounded-xl shadow-lg relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
        
        <div className="relative z-10">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm text-white/80 mb-2">
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/buildings" className="hover:text-white transition-colors">
              Buildings
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">{buildingName || 'Building'}</span>
          </nav>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                <span className="text-white font-bold text-lg">🏢</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {buildingName || 'Building Details'}
                </h1>
                <p className="text-white/80 text-sm">
                  Building Management & Compliance
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Status Indicator */}
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1 backdrop-blur-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-white">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Building Content */}
      {children}
    </div>
  )
}