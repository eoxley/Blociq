import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MajorWorksClient from './MajorWorksClient'

export default async function MajorWorksPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // Protect this route with Supabase Auth
  const { data: { session } } = await supabase.auth.getSession()

  // Temporarily allow access for demonstration purposes
  // if (!session) {
  //   redirect('/login')
  // }

  // Fetch major works projects with building information
  const { data: projects, error } = await supabase
    .from('major_works')
    .select(`
      *,
      buildings (
        name,
        address
      )
    `)
    .order('start_date', { ascending: false })

  if (error) {
    console.error('Error fetching major works:', error)
  }

  // Group projects by status
  const ongoingProjects = projects?.filter(project => project.status !== 'completed') || []
  const completedProjects = projects?.filter(project => project.status === 'completed') || []



  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header with Back to Home navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href="/home" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors border border-teal-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">Major Works Tracker</h1>
            <p className="text-gray-600">Track and manage major works projects across your portfolio</p>
          </div>
        </div>

        <MajorWorksClient
          ongoingProjects={ongoingProjects}
          completedProjects={completedProjects}
          onProjectCreated={(newProject) => {
            // This will be handled by the client component for optimistic updates
            console.log('New project created:', newProject)
          }}
        />
      </div>
    </LayoutWithSidebar>
  )
} 