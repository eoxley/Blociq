import { ReactNode } from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

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
      {/* Building Content */}
      {children}
    </div>
  )
}