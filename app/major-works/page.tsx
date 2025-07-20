import React from 'react'
import { createClient } from '@supabase/supabase-js'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import Link from 'next/link'
import { ArrowLeft, Plus, Building2, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

export default async function MajorWorksPage() {
  try {
    console.log('🔍 [MajorWorks] Fetching all projects...')
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Test database connection first
    console.log('🔍 [MajorWorks] Testing database connection...')
    console.log('🔍 [MajorWorks] Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing')
    console.log('🔍 [MajorWorks] Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
    
    // Test simple query first
    console.log('🔍 [MajorWorks] Testing simple query...')
    const { data: testData, error: testError } = await supabase
      .from('major_works')
      .select('count')
      .limit(1)
    
    console.log('🔍 [MajorWorks] Test query result:', { testData, testError })
    
    // Test count query
    console.log('🔍 [MajorWorks] Testing count query...')
    const { count, error: countError } = await supabase
      .from('major_works')
      .select('*', { count: 'exact', head: true })
    
    console.log('🔍 [MajorWorks] Count query result:', { count, countError })
    
    // Fetch all major works projects
    console.log('🔍 [MajorWorks] Executing database query...')
    
    const { data: projects, error } = await supabase
      .from('major_works')
      .select('*')
      .order('created_at', { ascending: false })
    
    console.log('🔍 [MajorWorks] Query completed')
    console.log('🔍 [MajorWorks] Raw response:', { data: projects, error })

    console.log('🔍 [MajorWorks] Fetched projects:', projects?.length || 0)
    console.log('🔍 [MajorWorks] Projects data:', projects)
    console.log('🔍 [MajorWorks] Error:', error)

    if (error) {
      console.error('❌ [MajorWorks] Error fetching projects:', error)
    }

    return (
      <LayoutWithSidebar>
        <div className="space-y-6">
          {/* Header with Back to Home navigation and Start New Project button */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
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
            
            {/* Start New Project Button */}
            <Link 
              href="/major-works/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-2xl hover:bg-teal-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Plus className="h-5 w-5" />
              Start New Project
            </Link>
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
                <div className="mt-4 p-4 bg-gray-100 rounded text-left">
                  <p className="text-sm text-gray-600">Debug Info:</p>
                  <p className="text-xs text-gray-500">Projects count: {projects?.length || 0}</p>
                  <p className="text-xs text-gray-500">Error: {error ? 'Yes' : 'No'}</p>
                  <p className="text-xs text-gray-500">Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing'}</p>
                  <p className="text-xs text-gray-500">Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}</p>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {projects.map((project, index) => (
                  <div 
                    key={project.id} 
                    className="group relative bg-white rounded-2xl shadow-md border border-gray-200 p-6 hover:shadow-lg hover:bg-slate-50 transition-all duration-500 opacity-0 animate-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Status indicator bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                      project.status === 'planned' ? 'bg-blue-500' :
                      project.status === 'ongoing' ? 'bg-yellow-500' :
                      project.status === 'completed' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`} />
                    
                    <Link href={`/major-works/${project.id}`} className="block">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 ml-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Building2 className="h-5 w-5 text-gray-400" />
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
                              {project.title}
                            </h3>
                          </div>
                          
                          <p className="text-gray-600 leading-relaxed mb-3">
                            {project.description?.substring(0, 120)}
                            {project.description && project.description.length > 120 && '...'}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>
                                {project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB') : 'No start date'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-300">•</span>
                              <span>{project.consultation_stage || 'No stage set'}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-6 flex flex-col items-end gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                            project.status === 'planned' ? 'bg-blue-100 text-blue-800' :
                            project.status === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                            project.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {project.status === 'planned' && <Clock className="h-4 w-4 mr-1" />}
                            {project.status === 'ongoing' && <AlertTriangle className="h-4 w-4 mr-1" />}
                            {project.status === 'completed' && <CheckCircle className="h-4 w-4 mr-1" />}
                            {project.status?.charAt(0).toUpperCase() + project.status?.slice(1) || 'Unknown'}
                          </span>
                          
                          <div className="text-xs text-gray-400">
                            ID: {project.id.substring(0, 8)}...
                          </div>
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