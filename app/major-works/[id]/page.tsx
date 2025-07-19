import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import MajorWorksProjectClient from './MajorWorksProjectClient'

interface PageProps {
  params: {
    id: string
  }
}

export default async function MajorWorksProjectPage({ params }: PageProps) {
  try {
    const supabase = createServerComponentClient({ cookies })
    
    // Fetch project details
    const { data: project, error } = await supabase
      .from('major_works')
      .select(`
        *,
        buildings (
          id,
          name,
          address
        )
      `)
      .eq('id', params.id)
      .single()

    if (error || !project) {
      console.error('Project not found or error:', error)
      notFound()
    }

    return <MajorWorksProjectClient project={project} />
  } catch (error) {
    console.error('Error loading Major Works project:', error)
    notFound()
  }
} 