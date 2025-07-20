'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  Handshake
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import AddTaskModal from './AddTaskModal'

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
  } = buildingData

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
    // This will trigger a page refresh to show the new task
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* AI Summary Button */}
      <div className="flex justify-end">
        <Button onClick={handleSummarise} disabled={isSummaryLoading} className="flex items-center gap-2">
          {isSummaryLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {isSummaryLoading ? 'Generating Summary...' : '🧠 Summarise this Building'}
        </Button>
      </div>

      {/* Building Summary Display */}
      {buildingSummary && (
        <Card className="bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Building Summary</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSummarise}
                disabled={isSummaryLoading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Ask Again
              </Button>
            </div>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{buildingSummary}</pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Building Overview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Building Information & Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Building Info */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">{building.name}</h3>
                <p className="text-sm text-gray-600 flex items-center gap-1 mb-3">
                  <MapPin className="h-4 w-4" />
                  {building.address}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 font-medium">Building Type</p>
                  <Badge variant="outline" className="w-fit">
                    {buildingSetup?.structure_type || 'Not specified'}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 font-medium">Total Units</p>
                  <p className="font-medium text-lg">{units.length} units</p>
                </div>

                {building.building_age && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 font-medium">Building Age</p>
                    <p className="font-medium">{building.building_age}</p>
                  </div>
                )}

                {building.total_floors && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 font-medium">Total Floors</p>
                    <p className="font-medium">{building.total_floors}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Freeholder/RMC Structure */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Gavel className="h-4 w-4" />
                Legal Structure
              </h4>
              
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Client Type</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    {buildingSetup?.client_type || 'Not specified'}
                  </p>
                </div>

                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900">Client Name</span>
                  </div>
                  <p className="text-sm text-green-700">
                    {buildingSetup?.client_name || 'Not specified'}
                  </p>
                  {buildingSetup?.client_email && (
                    <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
                      <MailIcon className="h-3 w-3" />
                      {buildingSetup.client_email}
                    </p>
                  )}
                  {buildingSetup?.client_contact && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {buildingSetup.client_contact}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Building Management Info */}
          {(building.building_manager_name || building.building_manager_email || building.building_manager_phone) && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Building Management
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {building.building_manager_name && (
                  <div>
                    <p className="text-sm text-gray-600">Manager</p>
                    <p className="font-medium">{building.building_manager_name}</p>
                  </div>
                )}
                {building.building_manager_email && (
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <a href={`mailto:${building.building_manager_email}`} className="text-blue-600 hover:underline">
                      {building.building_manager_email}
                    </a>
                  </div>
                )}
                {building.building_manager_phone && (
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <a href={`tel:${building.building_manager_phone}`} className="text-blue-600 hover:underline">
                      {building.building_manager_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {(building.emergency_contact_name || building.emergency_contact_phone) && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Emergency Contact
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {building.emergency_contact_name && (
                  <div>
                    <p className="text-sm text-red-600">Contact</p>
                    <p className="font-medium text-red-900">{building.emergency_contact_name}</p>
                  </div>
                )}
                {building.emergency_contact_phone && (
                  <div>
                    <p className="text-sm text-red-600">Phone</p>
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
            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Operational Notes
              </h4>
              <p className="text-sm text-yellow-800">{buildingSetup.operational_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Building Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Construction & Facilities */}
        {(building.construction_type || building.lift_available || building.heating_type || building.hot_water_type) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Building className="h-4 w-4" />
                Construction & Facilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {building.construction_type && (
                <div>
                  <p className="text-xs text-gray-600">Construction Type</p>
                  <p className="text-sm font-medium">{building.construction_type}</p>
                </div>
              )}
              {building.lift_available && (
                <div>
                  <p className="text-xs text-gray-600">Lift Available</p>
                  <p className="text-sm font-medium">{building.lift_available}</p>
                </div>
              )}
              {building.heating_type && (
                <div>
                  <p className="text-xs text-gray-600">Heating Type</p>
                  <p className="text-sm font-medium">{building.heating_type}</p>
                </div>
              )}
              {building.hot_water_type && (
                <div>
                  <p className="text-xs text-gray-600">Hot Water Type</p>
                  <p className="text-sm font-medium">{building.hot_water_type}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Services & Utilities */}
        {(building.waste_collection_day || building.recycling_info || building.service_charge_frequency) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Services & Utilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {building.waste_collection_day && (
                <div>
                  <p className="text-xs text-gray-600">Waste Collection</p>
                  <p className="text-sm font-medium">{building.waste_collection_day}</p>
                </div>
              )}
              {building.recycling_info && (
                <div>
                  <p className="text-xs text-gray-600">Recycling</p>
                  <p className="text-sm font-medium">{building.recycling_info}</p>
                </div>
              )}
              {building.service_charge_frequency && (
                <div>
                  <p className="text-xs text-gray-600">Service Charge</p>
                  <p className="text-sm font-medium">{building.service_charge_frequency}</p>
                </div>
              )}
              {building.ground_rent_amount && (
                <div>
                  <p className="text-xs text-gray-600">Ground Rent</p>
                  <p className="text-sm font-medium">£{building.ground_rent_amount} {building.ground_rent_frequency}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Safety & Compliance */}
        {(building.fire_safety_status || building.asbestos_status || building.energy_rating || building.building_insurance_provider) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Safety & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {building.fire_safety_status && (
                <div>
                  <p className="text-xs text-gray-600">Fire Safety</p>
                  <Badge variant={building.fire_safety_status === 'Compliant' ? 'default' : 'destructive'} className="text-xs">
                    {building.fire_safety_status}
                  </Badge>
                </div>
              )}
              {building.asbestos_status && (
                <div>
                  <p className="text-xs text-gray-600">Asbestos Status</p>
                  <Badge variant={building.asbestos_status === 'Clear' ? 'default' : 'destructive'} className="text-xs">
                    {building.asbestos_status}
                  </Badge>
                </div>
              )}
              {building.energy_rating && (
                <div>
                  <p className="text-xs text-gray-600">Energy Rating</p>
                  <p className="text-sm font-medium">{building.energy_rating}</p>
                </div>
              )}
              {building.building_insurance_provider && (
                <div>
                  <p className="text-xs text-gray-600">Insurance Provider</p>
                  <p className="text-sm font-medium">{building.building_insurance_provider}</p>
                  {building.building_insurance_expiry && (
                    <p className="text-xs text-gray-500">Expires: {new Date(building.building_insurance_expiry).toLocaleDateString()}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Compliance Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Compliance Summary
            </div>
            <Link href={`/buildings/${building.id}/compliance`}>
              <Button variant="outline" size="sm">
                View Compliance Tracker
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{complianceSummary.compliant}</div>
              <div className="text-sm text-gray-600">Compliant</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{complianceSummary.dueSoon}</div>
              <div className="text-sm text-gray-600">Due Soon</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{complianceSummary.overdue}</div>
              <div className="text-sm text-gray-600">Overdue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{complianceSummary.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>
          
          {/* Category badges */}
          {complianceAssets.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from(new Set(complianceAssets.map(asset => asset.compliance_assets?.category).filter(Boolean))).map(category => (
                <Badge key={category} variant="outline">
                  {category}: {complianceAssets.filter(asset => asset.compliance_assets?.category === category).length}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Units & Leaseholders Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Units & Leaseholders
          </CardTitle>
        </CardHeader>
        <CardContent>
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
                  <th className="text-left py-2">Unit</th>
                  <th className="text-left py-2">Leaseholder</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Phone</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => (
                  <tr key={unit.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{unit.unit_number}</td>
                    <td className="py-2">
                      {unit.leaseholders?.[0]?.name || 'No leaseholder'}
                    </td>
                    <td className="py-2">
                      {unit.leaseholders?.[0]?.email ? (
                        <a href={`mailto:${unit.leaseholders[0].email}`} className="text-blue-600 hover:underline">
                          {unit.leaseholders[0].email}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="py-2">
                      {unit.leaseholders?.[0]?.phone || '-'}
                    </td>
                    <td className="py-2">
                      <Badge variant={unit.leaseholders?.length > 0 ? "default" : "outline"}>
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
        </CardContent>
      </Card>

      {/* Tasks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              To-Do Items
            </div>
            <AddTaskModal buildingId={building.id} onTaskAdded={handleTaskAdded} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todos.length > 0 ? (
            <div className="space-y-3">
              {todos.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      {task.is_complete ? (
                        <CheckSquare className="h-4 w-4 text-green-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={task.is_complete ? 'line-through text-gray-500' : 'font-medium'}>
                        {task.title}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.due_date && (
                      <Badge 
                        variant={
                          task.is_complete ? 'outline' : 
                          new Date(task.due_date) < new Date() ? 'destructive' : 'default'
                        }
                        className="text-xs"
                      >
                        {format(new Date(task.due_date), 'MMM dd')}
                      </Badge>
                    )}
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
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No tasks found for this building.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Emails Section */}
      {recentEmails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Recent Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEmails.slice(0, 5).map((email) => (
                <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{email.subject}</span>
                      {email.unread && (
                        <Badge variant="default" className="text-xs">New</Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      From: {email.from_email} • {email.received_at ? formatDistanceToNow(new Date(email.received_at), { addSuffix: true }) : 'Unknown time'}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Section */}
      {(complianceDocs.length > 0 || buildingDocs.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {complianceDocs.slice(0, 3).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileCheck className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">{doc.doc_type}</p>
                      <p className="text-xs text-gray-600">
                        {doc.expiry_date && `Expires: ${new Date(doc.expiry_date).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {buildingDocs.slice(0, 3).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">{doc.file_name}</p>
                      <p className="text-xs text-gray-600">
                        {doc.created_at && `Uploaded: ${new Date(doc.created_at).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events Section */}
      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{event.title}</span>
                      {event.event_type && (
                        <Badge variant="outline" className="text-xs">{event.event_type}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      {format(new Date(event.start_time), 'MMM dd, yyyy HH:mm')}
                      {event.location && ` • ${event.location}`}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Assistant Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask a question about this building..."
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAiQuestion()}
              />
              <Button onClick={handleAiQuestion} disabled={isAiLoading}>
                {isAiLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {aiResponse && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">{aiResponse}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 