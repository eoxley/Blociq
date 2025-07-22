'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Building, 
  Users, 
  Mail, 
  FileText, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Search,
  Plus,
  ExternalLink,
  Clock,
  MapPin,
  Phone,
  Mail as MailIcon,
  Eye,
  Download,
  ChevronRight,
  Brain,
  Send,
  RefreshCw,
  CheckSquare,
  Square,
  Shield,
  Settings,
  Home,
  User,
  Briefcase,
  FileCheck,
  AlertCircle,
  Info,
  Building2,
  Gavel,
  Handshake,
  Edit3,
  TrendingUp,
  Activity,
  Zap,
  Wrench
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import AddTaskModal from './AddTaskModal'
import EditBuildingModal from './EditBuildingModal'
import BuildingUnitsDisplay from './components/BuildingUnitsDisplay'

interface BuildingCommandCentreProps {
  buildingData: {
    building: any
    buildingSetup: any
    complianceSummary: {
      total: number
      compliant: number
      dueSoon: number
      overdue: number
    }
    complianceAssets: any[]
    units: any[]
    recentEmails: any[]
    complianceDocs: any[]
    buildingDocs: any[]
    events: any[]
    todos: any[]
  }
}

export default function BuildingCommandCentre({ buildingData }: BuildingCommandCentreProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [buildingSummary, setBuildingSummary] = useState('')
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [updatedBuildingData, setUpdatedBuildingData] = useState(buildingData)
  
  // New state for API data
  const [majorWorksData, setMajorWorksData] = useState<any>(null)
  const [isLoadingMajorWorks, setIsLoadingMajorWorks] = useState(false)
  const [complianceData, setComplianceData] = useState<any>(null)
  const [isLoadingCompliance, setIsLoadingCompliance] = useState(false)

  const { 
    building, 
    buildingSetup, 
    complianceSummary, 
    complianceAssets, 
    units, 
    recentEmails, 
    complianceDocs, 
    buildingDocs, 
    events,
    todos
  } = updatedBuildingData

  // Filter units based on search
  const filteredUnits = units.filter(unit => 
    unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.leaseholders?.some((lh: any) => 
      lh.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // Handle AI question
  const handleAiQuestion = async () => {
    if (!aiQuestion.trim()) return
    
    setIsAiLoading(true)
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: aiQuestion,
          buildingId: building.id
        })
      })
      
      const data = await response.json()
      setAiResponse(data.answer || 'No response received')
    } catch (error) {
      setAiResponse('Error: Could not get AI response')
    } finally {
      setIsAiLoading(false)
    }
  }

  // Handle building summary
  const handleSummarise = async () => {
    setIsSummaryLoading(true)
    try {
      // Get current time to determine greeting
      const now = new Date()
      const hour = now.getHours()
      let timeGreeting = ''
      
      if (hour >= 5 && hour < 12) {
        timeGreeting = 'Good morning! '
      } else if (hour >= 12 && hour < 17) {
        timeGreeting = 'Good afternoon! '
      } else if (hour >= 17 && hour < 22) {
        timeGreeting = 'Good evening! '
      } else {
        timeGreeting = 'Good night! '
      }

      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building_id: building.id,
          prompt: `${timeGreeting}Please provide a comprehensive summary of compliance status, active tasks, and recent activity for ${building.name}. Include any urgent matters that need attention.`
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setBuildingSummary(data.summary)
      } else {
        setBuildingSummary('Error: Could not generate summary')
      }
    } catch (error) {
      setBuildingSummary('Error: Could not get building summary')
    } finally {
      setIsSummaryLoading(false)
    }
  }

  // Handle task refresh
  const handleTaskAdded = () => {
    window.location.reload()
  }

  // Handle building information update
  const handleBuildingUpdate = async (buildingData: any, setupData: any) => {
    setUpdatedBuildingData(buildingData)
    setIsEditModalOpen(false)
  }

  // Fetch major works data for this building
  const fetchMajorWorksData = async () => {
    setIsLoadingMajorWorks(true)
    try {
      const response = await fetch('/api/major-works/list')
      if (response.ok) {
        const data = await response.json()
        // Filter for this specific building
        const buildingProjects = data.projects?.find((group: any) => 
          group.building_id === building.id
        ) || { projects: [] }
        setMajorWorksData(buildingProjects)
      }
    } catch (error) {
      console.error('Error fetching major works data:', error)
    } finally {
      setIsLoadingMajorWorks(false)
    }
  }

  // Fetch compliance data for this building
  const fetchComplianceData = async () => {
    setIsLoadingCompliance(true)
    try {
      // Use the existing compliance data from buildingData for now
      // In the future, this could call a specific compliance API
      setComplianceData({
        summary: complianceSummary,
        assets: complianceAssets
      })
    } catch (error) {
      console.error('Error fetching compliance data:', error)
    } finally {
      setIsLoadingCompliance(false)
    }
  }

  // Load data on component mount
  React.useEffect(() => {
    fetchMajorWorksData()
    fetchComplianceData()
  }, [building.id])

  return (
    <div className="space-y-8">
      {/* Hero Header Section */}
      <div className="bg-gradient-to-r from-teal-600 to-blue-700 rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                <Building2 className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{building.name}</h1>
                <p className="text-teal-100 flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4" />
                  {building.address}
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold">{units.length}</div>
                <div className="text-sm text-teal-100">Units</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold">{complianceSummary.compliant}</div>
                <div className="text-sm text-teal-100">Compliant</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold">{todos.filter((t: any) => !t.is_complete).length}</div>
                <div className="text-sm text-teal-100">Active Tasks</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold">{recentEmails.filter((e: any) => e.unread).length}</div>
                <div className="text-sm text-teal-100">New Emails</div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => setIsEditModalOpen(true)} 
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Building
            </Button>
            
            <Button 
              onClick={handleSummarise} 
              disabled={isSummaryLoading} 
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30"
            >
              {isSummaryLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              {isSummaryLoading ? 'Generating...' : 'AI Summary'}
            </Button>
          </div>
        </div>
      </div>

      {/* Building Summary Display */}
      {buildingSummary && (
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-teal-900 flex items-center gap-2">
                <Brain className="h-5 w-5" />
                {(() => {
                  const now = new Date()
                  const hour = now.getHours()
                  let timeGreeting = ''
                  
                  if (hour >= 5 && hour < 12) {
                    timeGreeting = 'Good Morning'
                  } else if (hour >= 12 && hour < 17) {
                    timeGreeting = 'Good Afternoon'
                  } else if (hour >= 17 && hour < 22) {
                    timeGreeting = 'Good Evening'
                  } else {
                    timeGreeting = 'Good Night'
                  }
                  
                  return `${timeGreeting} - AI Building Summary`
                })()}
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSummarise}
                disabled={isSummaryLoading}
                className="border-teal-300 text-teal-700 hover:bg-teal-100"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-teal-800 font-sans bg-white/50 p-4 rounded-lg">{buildingSummary}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Units & Quick Actions */}
        <div className="space-y-6">
          {/* Units Overview */}
          <BuildingUnitsDisplay
            units={units}
            buildingName={building.name}
          />

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50 border-b">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Zap className="h-5 w-5 text-green-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <Link href={`/buildings/${building.id}/units`}>
                  <Button variant="outline" className="w-full h-auto p-3 flex flex-col items-center gap-2">
                    <Home className="h-5 w-5" />
                    <span className="text-xs">Manage Units</span>
                  </Button>
                </Link>
                
                <Link href={`/buildings/${building.id}/compliance`}>
                  <Button variant="outline" className="w-full h-auto p-3 flex flex-col items-center gap-2">
                    <Shield className="h-5 w-5" />
                    <span className="text-xs">Compliance</span>
                  </Button>
                </Link>
                
                <Link href={`/buildings/${building.id}/communications`}>
                  <Button variant="outline" className="w-full h-auto p-3 flex flex-col items-center gap-2">
                    <Send className="h-5 w-5" />
                    <span className="text-xs">Communications</span>
                  </Button>
                </Link>
                
                <Link href={`/buildings/${building.id}/documents`}>
                  <Button variant="outline" className="w-full h-auto p-3 flex flex-col items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <span className="text-xs">Documents</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-orange-50 border-b">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-900">
                  <CheckSquare className="h-5 w-5 text-orange-600" />
                  Quick Tasks
                </div>
                <AddTaskModal buildingId={building.id} onTaskAdded={handleTaskAdded} />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {todos.filter((t: any) => !t.is_complete).slice(0, 5).length > 0 ? (
                <div className="space-y-3">
                  {todos.filter((t: any) => !t.is_complete).slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Square className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {task.due_date && (
                          <p className="text-xs text-gray-500">
                            Due: {format(new Date(task.due_date), 'MMM dd')}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          task.priority === 'High' ? 'border-red-300 text-red-700' :
                          task.priority === 'Medium' ? 'border-yellow-300 text-yellow-700' :
                          'border-gray-300 text-gray-700'
                        }`}
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">All caught up!</p>
                  <p className="text-xs text-gray-400">No active tasks</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions & Status */}
        <div className="space-y-6">
          {/* Compliance Status */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-green-50 border-b">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-900">
                  <Shield className="h-5 w-5 text-green-600" />
                  Compliance Status
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-green-300 text-green-700 hover:bg-green-50"
                    onClick={fetchComplianceData}
                    disabled={isLoadingCompliance}
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingCompliance ? 'animate-spin' : ''}`} />
                  </Button>
                  <Link href={`/buildings/${building.id}/compliance`}>
                    <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingCompliance ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading compliance...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-100 rounded-lg">
                      <div className="text-2xl font-bold text-green-700">{complianceSummary.compliant}</div>
                      <div className="text-xs text-green-600 font-medium">Compliant</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-100 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-700">{complianceSummary.dueSoon}</div>
                      <div className="text-xs text-yellow-600 font-medium">Due Soon</div>
                    </div>
                    <div className="text-center p-3 bg-red-100 rounded-lg">
                      <div className="text-2xl font-bold text-red-700">{complianceSummary.overdue}</div>
                      <div className="text-xs text-red-600 font-medium">Overdue</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 rounded-lg">
                      <div className="text-2xl font-bold text-gray-700">{complianceSummary.total}</div>
                      <div className="text-xs text-gray-600 font-medium">Total</div>
                    </div>
                  </div>
                  
                  {complianceAssets.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Categories:</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(complianceAssets.map(asset => asset.compliance_assets?.category).filter(Boolean))).map(category => (
                          <Badge key={category} variant="outline" className="text-xs">
                            {category}: {complianceAssets.filter(asset => asset.compliance_assets?.category === category).length}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Major Works Status */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-orange-50 border-b">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-900">
                  <Wrench className="h-5 w-5 text-orange-600" />
                  Major Works
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={fetchMajorWorksData}
                    disabled={isLoadingMajorWorks}
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingMajorWorks ? 'animate-spin' : ''}`} />
                  </Button>
                  <Link href={`/buildings/${building.id}/major-works`}>
                    <Button variant="outline" size="sm" className="border-orange-300 text-orange-700 hover:bg-orange-50">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingMajorWorks ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading major works...</p>
                </div>
              ) : majorWorksData?.projects?.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-orange-100 rounded-lg">
                      <div className="text-2xl font-bold text-orange-700">
                        {majorWorksData.projects.filter((p: any) => p.status === 'active').length}
                      </div>
                      <div className="text-xs text-orange-600 font-medium">Active</div>
                    </div>
                    <div className="text-center p-3 bg-blue-100 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700">
                        {majorWorksData.projects.filter((p: any) => p.status === 'completed').length}
                      </div>
                      <div className="text-xs text-blue-600 font-medium">Completed</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Recent Projects:</p>
                    {majorWorksData.projects.slice(0, 3).map((project: any) => (
                      <div key={project.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{project.title}</p>
                          <p className="text-xs text-gray-500">
                            {project.completion_percentage}% complete
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            project.status === 'active' ? 'border-orange-300 text-orange-700' :
                            project.status === 'completed' ? 'border-green-300 text-green-700' :
                            'border-gray-300 text-gray-700'
                          }`}
                        >
                          {project.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Wrench className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No major works projects</p>
                  <p className="text-xs text-gray-400">Create your first project to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Activity className="h-5 w-5 text-blue-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Recent Emails */}
                {recentEmails.slice(0, 3).map((email) => (
                  <div key={email.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{email.subject}</p>
                      <p className="text-xs text-gray-500">
                        {email.received_at ? formatDistanceToNow(new Date(email.received_at), { addSuffix: true }) : 'Unknown time'}
                      </p>
                    </div>
                    {email.unread && (
                      <Badge variant="default" className="text-xs flex-shrink-0">New</Badge>
                    )}
                  </div>
                ))}

                {/* Recent Events */}
                {events.slice(0, 2).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(event.start_time), 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}

                {recentEmails.length === 0 && events.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Assistant */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Brain className="h-5 w-5 text-purple-600" />
                AI Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about this building..."
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAiQuestion()}
                    className="text-sm"
                  />
                  <Button onClick={handleAiQuestion} disabled={isAiLoading} size="sm">
                    {isAiLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {aiResponse && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-800">{aiResponse}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Building Modal */}
      <EditBuildingModal
        building={building}
        buildingSetup={buildingSetup}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleBuildingUpdate}
      />
    </div>
  )
} 