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
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import AddTaskModal from './AddTaskModal'
import EditBuildingModal from './EditBuildingModal'

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
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          building_id: building.id,
          prompt: 'Summarise compliance, tasks, and recent activity for this building'
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
    try {
      const response = await fetch(`/api/buildings/${building.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingData, setupData })
      })

      if (!response.ok) {
        throw new Error('Failed to update building')
      }

      setUpdatedBuildingData({
        ...updatedBuildingData,
        building: { ...updatedBuildingData.building, ...buildingData },
        buildingSetup: { ...updatedBuildingData.buildingSetup, ...setupData }
      })

      return true
    } catch (error) {
      console.error('Error updating building:', error)
      throw error
    }
  }

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
                AI Building Summary
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
        {/* Left Column - Building Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Building Information Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Building2 className="h-5 w-5 text-teal-600" />
                Building Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Gavel className="h-4 w-4" />
                      Legal Structure
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-blue-700 font-medium">Client Type:</span>
                        <p className="text-blue-900">{buildingSetup?.client_type || 'Not specified'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-blue-700 font-medium">Client Name:</span>
                        <p className="text-blue-900">{buildingSetup?.client_name || 'Not specified'}</p>
                      </div>
                      {buildingSetup?.client_email && (
                        <div>
                          <span className="text-sm text-blue-700 font-medium">Email:</span>
                          <a href={`mailto:${buildingSetup.client_email}`} className="text-blue-600 hover:underline">
                            {buildingSetup.client_email}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Building Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 font-medium">Building Type</p>
                      <p className="font-semibold">{buildingSetup?.structure_type || 'Not specified'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 font-medium">Total Units</p>
                      <p className="font-semibold">{units.length}</p>
                    </div>
                    {building.building_age && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 font-medium">Building Age</p>
                        <p className="font-semibold">{building.building_age}</p>
                      </div>
                    )}
                    {building.total_floors && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 font-medium">Total Floors</p>
                        <p className="font-semibold">{building.total_floors}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Management & Safety */}
                <div className="space-y-4">
                  {/* Building Management */}
                  {(building.building_manager_name || building.building_manager_email || building.building_manager_phone) && (
                    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Building Management
                      </h4>
                      <div className="space-y-2">
                        {building.building_manager_name && (
                          <div>
                            <span className="text-sm text-green-700 font-medium">Manager:</span>
                            <p className="text-green-900">{building.building_manager_name}</p>
                          </div>
                        )}
                        {building.building_manager_email && (
                          <div>
                            <span className="text-sm text-green-700 font-medium">Email:</span>
                            <a href={`mailto:${building.building_manager_email}`} className="text-green-600 hover:underline">
                              {building.building_manager_email}
                            </a>
                          </div>
                        )}
                        {building.building_manager_phone && (
                          <div>
                            <span className="text-sm text-green-700 font-medium">Phone:</span>
                            <a href={`tel:${building.building_manager_phone}`} className="text-green-600 hover:underline">
                              {building.building_manager_phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Emergency Contact */}
                  {(building.emergency_contact_name || building.emergency_contact_phone) && (
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Emergency Contact
                      </h4>
                      <div className="space-y-2">
                        {building.emergency_contact_name && (
                          <div>
                            <span className="text-sm text-red-700 font-medium">Contact:</span>
                            <p className="text-red-900">{building.emergency_contact_name}</p>
                          </div>
                        )}
                        {building.emergency_contact_phone && (
                          <div>
                            <span className="text-sm text-red-700 font-medium">Phone:</span>
                            <a href={`tel:${building.emergency_contact_phone}`} className="text-red-700 hover:underline font-medium">
                              {building.emergency_contact_phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Operational Notes */}
                  {buildingSetup?.operational_notes && (
                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                      <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Operational Notes
                      </h4>
                      <p className="text-sm text-yellow-800">{buildingSetup.operational_notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Units & Leaseholders */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-purple-50 border-b">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-900">
                  <Users className="h-5 w-5 text-purple-600" />
                  Units & Leaseholders
                </div>
                <Link href={`/buildings/${building.id}/units`}>
                  <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search units or leaseholders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-semibold text-gray-700">Unit</th>
                      <th className="text-left py-2 font-semibold text-gray-700">Leaseholder</th>
                      <th className="text-left py-2 font-semibold text-gray-700">Contact</th>
                      <th className="text-left py-2 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnits.slice(0, 8).map((unit) => (
                      <tr key={unit.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 font-medium">{unit.unit_number}</td>
                        <td className="py-3">
                          {unit.leaseholders?.[0]?.name || 'No leaseholder'}
                        </td>
                        <td className="py-3">
                          {unit.leaseholders?.[0]?.email ? (
                            <a href={`mailto:${unit.leaseholders[0].email}`} className="text-blue-600 hover:underline text-xs">
                              {unit.leaseholders[0].email}
                            </a>
                          ) : '-'}
                        </td>
                        <td className="py-3">
                          <Badge variant={unit.leaseholders?.length > 0 ? "default" : "outline"} className="text-xs">
                            {unit.leaseholders?.length > 0 ? 'Has Leaseholder' : 'No Leaseholder'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredUnits.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No units found matching your search.
                </div>
              )}
              
              {filteredUnits.length > 8 && (
                <div className="text-center pt-4">
                  <Link href={`/buildings/${building.id}/units`}>
                    <Button variant="outline" size="sm">
                      View All {filteredUnits.length} Units
                    </Button>
                  </Link>
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
                <Link href={`/buildings/${building.id}/compliance`}>
                  <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
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
            </CardContent>
          </Card>

          {/* Quick Tasks */}
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