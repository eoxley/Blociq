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
  Square
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

      {/* Building Overview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Building Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">{building.name}</h3>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {building.address}
              </p>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Type</p>
              <Badge variant="outline">
                {buildingSetup?.structure_type || 'Not specified'}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Client</p>
              <p className="font-medium">{buildingSetup?.client_name || 'Not specified'}</p>
              {buildingSetup?.client_email && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MailIcon className="h-3 w-3" />
                  {buildingSetup.client_email}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Units</p>
              <p className="font-medium">{units.length} units</p>
              <p className="text-sm text-gray-600">
                {units.filter(u => u.leaseholders?.length > 0).length} occupied
              </p>
            </div>
          </div>
          
          {buildingSetup?.operational_notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{buildingSetup.operational_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                      {unit.leaseholders?.[0]?.name || 'Vacant'}
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
                        {unit.leaseholders?.length > 0 ? 'Occupied' : 'Vacant'}
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Recent Emails
            </div>
            <Link href="/inbox">
              <Button variant="outline" size="sm">
                Open in Inbox
                <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEmails.length > 0 ? (
            <div className="space-y-3">
              {recentEmails.map((email) => (
                <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{email.subject || 'No Subject'}</p>
                    <p className="text-sm text-gray-600 truncate">From: {email.from_email}</p>
                    <p className="text-xs text-gray-500">
                      {email.received_at ? formatDistanceToNow(new Date(email.received_at), { addSuffix: true }) : 'Unknown date'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {email.unread && <Badge variant="destructive" className="text-xs">New</Badge>}
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent emails for this building.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              📁 Documents
            </div>
            <Link href={`/buildings/${building.id}/documents`}>
              <Button variant="outline" size="sm">
                View All Documents
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {complianceDocs.length > 0 || buildingDocs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Doc Type</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceDocs.map((doc) => (
                    <TableRow key={`compliance-${doc.id}`}>
                      <TableCell className="font-medium">
                        <a href={doc.doc_url || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {doc.doc_type || 'Compliance Document'}
                        </a>
                      </TableCell>
                      <TableCell>Compliance</TableCell>
                      <TableCell>
                        {doc.created_at ? format(new Date(doc.created_at), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {doc.expiry_date ? (
                          <Badge 
                            variant={new Date(doc.expiry_date) < new Date() ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {format(new Date(doc.expiry_date), 'MMM dd, yyyy')}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {buildingDocs.map((doc) => (
                    <TableRow key={`building-${doc.id}`}>
                      <TableCell className="font-medium">
                        <a href={doc.file_url || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {doc.file_name}
                        </a>
                      </TableCell>
                      <TableCell>{doc.type || 'Building Document'}</TableCell>
                      <TableCell>
                        {doc.created_at ? format(new Date(doc.created_at), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm text-muted">No documents uploaded for this building yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Events
            </div>
            <Link href={`/buildings/${building.id}/events`}>
              <Button variant="outline" size="sm">
                View All Events
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-gray-600">{event.description}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(event.start_time), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <Badge variant="outline">{event.event_type || 'Event'}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No upcoming events scheduled.
            </div>
          )}
        </CardContent>
      </Card>

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
                placeholder="Ask about this building (e.g., 'Summarise open issues', 'Draft email to directors')"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAiQuestion()}
              />
              <Button onClick={handleAiQuestion} disabled={isAiLoading}>
                {isAiLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {aiResponse && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiResponse}</p>
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              <p>💡 Try asking:</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>"Summarise open compliance issues"</li>
                <li>"Draft email to directors about recent maintenance"</li>
                <li>"List all vacant units"</li>
                <li>"What documents are expiring soon?"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 