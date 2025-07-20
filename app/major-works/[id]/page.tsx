import { createClient } from '@supabase/supabase-js'

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

    console.log('✅ [MajorWorks] Project loaded successfully:', { id: project.id, title: project.title })

    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{project.title}</h1>
        <p className="text-gray-700">{project.description || 'No description available.'}</p>
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