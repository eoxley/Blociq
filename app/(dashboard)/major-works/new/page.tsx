import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Plus } from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import CreateMajorWorksModal from '@/components/CreateMajorWorksModal'

export default function NewMajorWorksPage() {
  return (
    <LayoutWithSidebar>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/major-works" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Major Works
          </Link>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Create New Major Works Project</h1>
            <p className="text-gray-600">
              Set up a new major works project with all the necessary details and timeline.
            </p>
          </div>
          
          <CreateMajorWorksModal />
        </div>
      </div>
    </LayoutWithSidebar>
  )
} 