'use client'

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import MajorWorksTimeline from '@/components/MajorWorksTimeline'
import MajorWorksProjectClient from './MajorWorksProjectClient'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function MajorWorksProjectPage({ params }: { params: { id: string } }) {
  const { data: project } = await supabase
    .from('major_works_projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!project) {
    return (
      <LayoutWithSidebar>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/major-works" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Back to Major Works
            </Link>
          </div>
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Project Not Found</h1>
            <p className="text-gray-600">The major works project you're looking for doesn't exist.</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }

  return (
    <LayoutWithSidebar>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/major-works" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Major Works
          </Link>
        </div>
        
        <MajorWorksProjectClient project={project} />
      </div>
    </LayoutWithSidebar>
  )
} 