import React from 'react'
import { createClient } from '@supabase/supabase-js'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function MajorWorksPage() {
  try {
    console.log('🔍 [MajorWorks] Fetching all projects...')
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Fetch all major works projects
    const { data: projects, error } = await supabase
      .from('major_works')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('🔍 [MajorWorks] Fetched projects:', projects?.length || 0)
    console.log('🔍 [MajorWorks] Projects data:', projects)

    if (error) {
      console.error('❌ [MajorWorks] Error fetching projects:', error)
    }

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

          {/* Projects List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">All Projects</h2>
            </div>
            
            {!projects || projects.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-gray-500 text-lg">No projects found</p>
                <p className="text-gray-400 text-sm mt-1">Create your first major works project to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {projects.map((project) => (
                  <div key={project.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <Link href={`/major-works/${project.id}`} className="block">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 hover:text-teal-600 transition-colors">
                            {project.title}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {project.description?.substring(0, 100)}...
                          </p>
                        </div>
                        <div className="ml-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            project.status === 'Planned' ? 'bg-blue-100 text-blue-800' :
                            project.status === 'Ongoing' ? 'bg-yellow-100 text-yellow-800' :
                            project.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {project.status}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </LayoutWithSidebar>
    )
  } catch (error) {
    console.error('💥 [MajorWorks] Unexpected error:', error)
    return (
      <LayoutWithSidebar>
        <div className="space-y-6">
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
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-500 text-center">An error occurred while loading projects.</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }
} 