import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MajorWorksTimeline from '@/components/MajorWorksTimeline'
import DocumentUpload from '@/components/DocumentUpload'

interface PageProps {
  params: {
    id: string
  }
}

export default async function MajorWorksProjectPage({ params }: PageProps) {
  try {
    console.log('🔍 [MajorWorks] Starting page load with params:', params)
    
    const projectId = params.id
    console.log('🔍 [MajorWorks] Project ID:', projectId)

    if (!projectId) {
      console.log('❌ [MajorWorks] No project ID provided')
      return (
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No project found</h1>
          <p className="text-gray-600">No project ID was provided.</p>
        </div>
      )
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    console.log('🔍 [MajorWorks] Fetching project from database...')
    
    const { data: project, error } = await supabase
      .from('major_works')
      .select('*')
      .eq('id', projectId)
      .single()

    console.log('🔍 [MajorWorks] Database response:', { project: project ? 'found' : 'null', error })

    if (error) {
      console.error('❌ [MajorWorks] Database error:', error)
      return (
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No project found</h1>
          <p className="text-gray-600">Unable to load the requested project.</p>
        </div>
      )
    }

    if (!project) {
      console.log('❌ [MajorWorks] No project found for ID:', projectId)
      return (
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No project found</h1>
          <p className="text-gray-600">The requested project could not be found.</p>
        </div>
      )
    }

    // Fetch logs for this project
    const { data: logs, error: logsError } = await supabase
      .from('major_works_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('timestamp', { ascending: false })

    console.log('🔍 [MajorWorks] Project logs:', logs?.length || 0)
    console.log('✅ [MajorWorks] Project loaded successfully:', { id: project.id, title: project.title })

      return (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Back to Projects */}
            <div className="mb-6">
              <Link 
                href="/major-works" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Projects
              </Link>
            </div>

            {/* Project Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.title}</h1>
                  <p className="text-gray-600">Project ID: {project.id}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  project.status === 'planned' ? 'bg-blue-100 text-blue-800' :
                  project.status === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                  project.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {project.status?.charAt(0).toUpperCase() + project.status?.slice(1) || 'Unknown'}
                </span>
              </div>
              
              <p className="text-gray-700 text-lg leading-relaxed">
                {project.description || 'No description available.'}
              </p>
            </div>

            {/* Project Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Consultation Stage</h3>
                    <p className="text-gray-900 mt-1">{project.consultation_stage || 'Not specified'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Start Date</h3>
                    <p className="text-gray-900 mt-1">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB') : 'Not specified'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Estimates Issued</h3>
                    <p className="text-gray-900 mt-1">
                      {project.estimates_issued ? new Date(project.estimates_issued).toLocaleDateString('en-GB') : 'Not specified'}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Construction Start</h3>
                    <p className="text-gray-900 mt-1">
                      {project.construction_start ? new Date(project.construction_start).toLocaleDateString('en-GB') : 'Not specified'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Completion Date</h3>
                    <p className="text-gray-900 mt-1">
                      {project.completion_date ? new Date(project.completion_date).toLocaleDateString('en-GB') : 'Not specified'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Created</h3>
                    <p className="text-gray-900 mt-1">
                      {project.created_at ? new Date(project.created_at).toLocaleDateString('en-GB') : 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline & Observations */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <MajorWorksTimeline 
                project={project}
                logs={logs || []}
              />
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <DocumentUpload projectId={projectId} />
            </div>
          </div>
        </div>
      )

  } catch (error) {
    console.error('💥 [MajorWorks] Unexpected error in page component:', error)
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">No project found</h1>
        <p className="text-gray-600">An error occurred while loading the project.</p>
      </div>
    )
  }
} 