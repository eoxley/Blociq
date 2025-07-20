import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Building2, Plus } from 'lucide-react'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'

export default function NewMajorWorksProjectPage() {
  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            href="/major-works" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors border border-teal-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#0F5D5D] mb-2">Start New Project</h1>
            <p className="text-gray-600">Create a new major works project</p>
          </div>
        </div>

        {/* Placeholder Content */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-6">
              <Building2 className="h-8 w-8 text-teal-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Creation Coming Soon</h2>
            
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              The project creation form is currently under development. You'll be able to create new major works projects with full timeline tracking and logging capabilities.
            </p>
            
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Planned Features:</h3>
              <ul className="text-left space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-teal-500" />
                  Project details and description
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-teal-500" />
                  Section 20 notice dates
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-teal-500" />
                  Timeline milestones
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-teal-500" />
                  Budget and contractor information
                </li>
                <li className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-teal-500" />
                  Document uploads
                </li>
              </ul>
            </div>
            
            <Link 
              href="/major-works"
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Projects
            </Link>
          </div>
        </div>
      </div>
    </LayoutWithSidebar>
  )
} 