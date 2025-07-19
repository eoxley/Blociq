import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Building, User, Clock, FileText, MessageSquare } from 'lucide-react'
import MajorWorksTimeline from '@/components/MajorWorksTimeline'
import DocumentsAndObservationsTab from '@/components/DocumentsAndObservationsTab'

interface PageProps {
  params: {
    id: string
  }
}

export default async function MajorWorksProjectPage({ params }: PageProps) {
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
    notFound()
  }

  // Fetch building details
  const building = project.buildings

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-800'
      case 'consulting': return 'bg-yellow-100 text-yellow-800'
      case 'awaiting contractor': return 'bg-orange-100 text-orange-800'
      case 'in progress': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Project Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
            <p className="text-gray-600 mt-1">
              Project ID: {project.id}
            </p>
          </div>
          <Badge className={getStatusColor(project.status)}>
            {getStatusLabel(project.status)}
          </Badge>
        </div>

        {/* Project Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Building
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{building?.name}</p>
              <p className="text-sm text-gray-600">{building?.address}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB') : 'Not set'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Estimates Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {project.estimates_date ? new Date(project.estimates_date).toLocaleDateString('en-GB') : 'Not set'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Completion Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {project.completion_date ? new Date(project.completion_date).toLocaleDateString('en-GB') : 'Not set'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Section 20 Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MajorWorksTimeline 
              startDate={project.start_date}
              estimatesIssued={project.estimates_date}
              constructionStart={project.construction_start_date}
              completionDate={project.completion_date}
              status={project.status}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents & Observations
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Project Details</h3>
                  <p className="text-gray-700">{project.description || 'No description available.'}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Key Dates</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Notice of Intention:</span>
                        <span>{project.start_date ? new Date(project.start_date).toLocaleDateString('en-GB') : 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estimates Issued:</span>
                        <span>{project.estimates_date ? new Date(project.estimates_date).toLocaleDateString('en-GB') : 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Construction Start:</span>
                        <span>{project.construction_start_date ? new Date(project.construction_start_date).toLocaleDateString('en-GB') : 'Not set'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completion:</span>
                        <span>{project.completion_date ? new Date(project.completion_date).toLocaleDateString('en-GB') : 'Not set'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Project Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current Status:</span>
                        <Badge className={getStatusColor(project.status)}>
                          {getStatusLabel(project.status)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Building:</span>
                        <span>{building?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span>{new Date(project.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsAndObservationsTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Section 20 Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                          <MajorWorksTimeline 
              startDate={project.start_date}
              estimatesIssued={project.estimates_date}
              constructionStart={project.construction_start_date}
              completionDate={project.completion_date}
              status={project.status}
            />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 