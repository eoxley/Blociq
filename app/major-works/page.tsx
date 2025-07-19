import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import Link from 'next/link'
import { ArrowLeft, Plus, Wrench, CheckCircle } from 'lucide-react'

export default async function MajorWorksPage() {
  const supabase = createServerComponentClient({ cookies })
  
  // Protect this route with Supabase Auth
  const { data: { session } } = await supabase.auth.getSession()

  // Temporarily allow access for demonstration purposes
  // if (!session) {
  //   redirect('/login')
  // }

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

        {/* Ongoing Projects Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="h-6 w-6 text-teal-600" />
            <h2 className="text-xl font-semibold text-gray-900">Ongoing Projects</h2>
          </div>
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No ongoing projects</p>
            <p className="text-sm text-gray-400">Start a new project to begin tracking major works</p>
          </div>
        </div>

        {/* Completed Projects Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Completed Projects</h2>
          </div>
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No completed projects</p>
            <p className="text-sm text-gray-400">Completed projects will appear here</p>
          </div>
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <button className="bg-teal-600 hover:bg-teal-700 text-white rounded-full p-4 shadow-lg transition-colors duration-200 group">
            <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </LayoutWithSidebar>
  )
} 