import React from 'react'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LayoutWithSidebar from '@/components/LayoutWithSidebar'
import Link from 'next/link'
import { ArrowLeft, Plus, Wrench, CheckCircle, Calendar, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import MajorWorksTimeline from '@/components/MajorWorksTimeline'

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

  // Helper function to format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Helper function to get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'success'
      case 'in_progress':
        return 'warning'
      case 'planning':
        return 'info'
      case 'on_hold':
        return 'outline'
      default:
        return 'default'
    }
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

        {/* Ongoing Projects Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Wrench className="h-6 w-6 text-teal-600" />
            <h2 className="text-xl font-semibold text-gray-900">🟡 Ongoing Projects</h2>
          </div>
          {ongoingProjects.length > 0 ? (
            <div className="grid gap-4">
              {ongoingProjects.map((project: any) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{project.title}</CardTitle>
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {project.buildings?.name || 'Unknown Building'}
                          </span>
                        </div>
                        <Badge variant={getStatusBadgeVariant(project.status)}>
                          {project.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Timeline Section */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Section 20 Timeline (18 months)</h4>
                      <MajorWorksTimeline
                        startDate={project.start_date}
                        estimatesIssued={project.estimates_issued}
                        constructionStart={project.construction_start}
                        completionDate={project.completion_date}
                        status={project.status}
                      />
                    </div>

                    {/* Date Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <Calendar className="h-3 w-3" />
                          <span>Start Date</span>
                        </div>
                        <span className="font-medium">{formatDate(project.start_date)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <Calendar className="h-3 w-3" />
                          <span>Estimates</span>
                        </div>
                        <span className="font-medium">{formatDate(project.estimates_issued)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <Calendar className="h-3 w-3" />
                          <span>Construction</span>
                        </div>
                        <span className="font-medium">{formatDate(project.construction_start)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <Calendar className="h-3 w-3" />
                          <span>Completion</span>
                        </div>
                        <span className="font-medium">{formatDate(project.completion_date)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No ongoing projects</p>
              <p className="text-sm text-gray-400">Start a new project to begin tracking major works</p>
            </div>
          )}
        </div>

        {/* Completed Projects Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">✅ Completed Projects</h2>
          </div>
          {completedProjects.length > 0 ? (
            <div className="grid gap-4">
              {completedProjects.map((project: any) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{project.title}</CardTitle>
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {project.buildings?.name || 'Unknown Building'}
                          </span>
                        </div>
                        <Badge variant={getStatusBadgeVariant(project.status)}>
                          {project.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Timeline Section */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Section 20 Timeline (18 months)</h4>
                      <MajorWorksTimeline
                        startDate={project.start_date}
                        estimatesIssued={project.estimates_issued}
                        constructionStart={project.construction_start}
                        completionDate={project.completion_date}
                        status={project.status}
                      />
                    </div>

                    {/* Date Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <Calendar className="h-3 w-3" />
                          <span>Start Date</span>
                        </div>
                        <span className="font-medium">{formatDate(project.start_date)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <Calendar className="h-3 w-3" />
                          <span>Estimates</span>
                        </div>
                        <span className="font-medium">{formatDate(project.estimates_issued)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <Calendar className="h-3 w-3" />
                          <span>Construction</span>
                        </div>
                        <span className="font-medium">{formatDate(project.construction_start)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-500 mb-1">
                          <Calendar className="h-3 w-3" />
                          <span>Completion</span>
                        </div>
                        <span className="font-medium">{formatDate(project.completion_date)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No completed projects</p>
              <p className="text-sm text-gray-400">Completed projects will appear here</p>
            </div>
          )}
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