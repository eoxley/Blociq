'use client'

import React, { useState, useEffect } from 'react'
import { 
  Mail, 
  FileText, 
  Building, 
  Users, 
  Search, 
  Send, 
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'

interface Building {
  id: string
  name: string
  address: string
}

interface Unit {
  id: string
  unit_number: string
  building_id: string
  building?: Building
}

interface Leaseholder {
  id: string
  name: string
  email: string
  phone: string | null
  unit_id: string
  unit?: Unit
}

interface CommunicationLog {
  id: string
  type: 'email' | 'letter'
  building_id: string | null
  unit_id: string | null
  leaseholder_id: string | null
  subject: string
  content: string
  sent_at: string
  sent_by: string
  building_name?: string
  leaseholder_name?: string
  unit_number?: string
}

export default function CommunicationsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [leaseholders, setLeaseholders] = useState<Leaseholder[]>([])
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Message composer state
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [selectedLeaseholder, setSelectedLeaseholder] = useState<string>('')
  const [messageType, setMessageType] = useState<'email' | 'letter'>('email')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Load buildings
      const { data: buildingsData } = await supabase
        .from('buildings')
        .select('id, name, address')
        .order('name')

      if (buildingsData) {
        setBuildings(buildingsData)
      }

      // Load communication logs
      await loadCommunicationLogs()

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const loadCommunicationLogs = async () => {
    try {
      const { data: logs, error } = await supabase
        .from('communications_log')
        .select(`
          id,
          type,
          building_id,
          unit_id,
          leaseholder_id,
          subject,
          content,
          sent_at,
          sent_by,
          building_name,
          leaseholder_name,
          unit_number
        `)
        .order('sent_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('Error loading communication logs:', error)
        return
      }

      setCommunicationLogs(logs || [])
    } catch (error) {
      console.error('Error loading communication logs:', error)
    }
  }

  const loadUnitsForBuilding = async (buildingId: string) => {
    try {
      const { data: unitsData } = await supabase
        .from('units')
        .select(`
          id,
          unit_number,
          building_id,
          buildings (
            id,
            name,
            address
          )
        `)
        .eq('building_id', buildingId)
        .order('unit_number')

      if (unitsData) {
        setUnits(unitsData)
      }
    } catch (error) {
      console.error('Error loading units:', error)
    }
  }

  const loadLeaseholdersForUnit = async (unitId: string) => {
    try {
      const { data: leaseholdersData } = await supabase
        .from('leaseholders')
        .select(`
          id,
          name,
          email,
          phone,
          unit_id,
          units (
            id,
            unit_number,
            building_id,
            buildings (
              id,
              name,
              address
            )
          )
        `)
        .eq('unit_id', unitId)
        .order('name')

      if (leaseholdersData) {
        setLeaseholders(leaseholdersData)
      }
    } catch (error) {
      console.error('Error loading leaseholders:', error)
    }
  }

  const handleBuildingChange = (buildingId: string) => {
    setSelectedBuilding(buildingId)
    setSelectedUnit('')
    setSelectedLeaseholder('')
    setUnits([])
    setLeaseholders([])
    
    if (buildingId) {
      loadUnitsForBuilding(buildingId)
    }
  }

  const handleUnitChange = (unitId: string) => {
    setSelectedUnit(unitId)
    setSelectedLeaseholder('')
    setLeaseholders([])
    
    if (unitId) {
      loadLeaseholdersForUnit(unitId)
    }
  }

  const getRecipientCount = () => {
    if (selectedLeaseholder) return 1
    if (selectedUnit) return leaseholders.length
    if (selectedBuilding) {
      // Count all leaseholders in the building
      return leaseholders.length
    }
    return 0
  }

  const handleSendMessage = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error('Please fill in subject and content')
      return
    }

    const recipientCount = getRecipientCount()
    if (recipientCount === 0) {
      toast.error('Please select at least one recipient')
      return
    }

    setIsSending(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('User not authenticated')
        return
      }

      // Determine recipients
      let recipients: Leaseholder[] = []
      
      if (selectedLeaseholder) {
        const leaseholder = leaseholders.find(l => l.id === selectedLeaseholder)
        if (leaseholder) recipients = [leaseholder]
      } else if (selectedUnit) {
        recipients = leaseholders
      } else if (selectedBuilding) {
        // Get all leaseholders in the building
        const { data: buildingLeaseholders } = await supabase
          .from('leaseholders')
          .select(`
            id,
            name,
            email,
            phone,
            unit_id,
            units (
              id,
              unit_number,
              building_id,
              buildings (
                id,
                name,
                address
              )
            )
          `)
          .eq('units.building_id', selectedBuilding)
          .order('name')

        if (buildingLeaseholders) {
          recipients = buildingLeaseholders
        }
      }

      // Send message to each recipient
      const sendPromises = recipients.map(async (recipient) => {
        try {
          if (messageType === 'email' && recipient.email) {
            // Send email (simulate for now)
            console.log(`Sending email to ${recipient.email}: ${subject}`)
            
            // Log the communication
            const { error: logError } = await supabase
              .from('communications_log')
              .insert({
                type: 'email',
                building_id: recipient.unit?.building_id || null,
                unit_id: recipient.unit_id || null,
                leaseholder_id: recipient.id,
                subject,
                content,
                sent_at: new Date().toISOString(),
                sent_by: user.id,
                building_name: recipient.unit?.buildings?.name || 'Unknown',
                leaseholder_name: recipient.name,
                unit_number: recipient.unit?.unit_number || 'Unknown'
              })

            if (logError) {
              console.error('Error logging communication:', logError)
            }
          } else if (messageType === 'letter') {
            // Generate letter (simulate for now)
            console.log(`Generating letter for ${recipient.name}: ${subject}`)
            
            // Log the communication
            const { error: logError } = await supabase
              .from('communications_log')
              .insert({
                type: 'letter',
                building_id: recipient.unit?.building_id || null,
                unit_id: recipient.unit_id || null,
                leaseholder_id: recipient.id,
                subject,
                content,
                sent_at: new Date().toISOString(),
                sent_by: user.id,
                building_name: recipient.unit?.buildings?.name || 'Unknown',
                leaseholder_name: recipient.name,
                unit_number: recipient.unit?.unit_number || 'Unknown'
              })

            if (logError) {
              console.error('Error logging communication:', logError)
            }
          }
        } catch (error) {
          console.error(`Error sending to ${recipient.name}:`, error)
        }
      })

      await Promise.all(sendPromises)

      // Reload communication logs
      await loadCommunicationLogs()

      // Reset form
      setSubject('')
      setContent('')
      setSelectedBuilding('')
      setSelectedUnit('')
      setSelectedLeaseholder('')
      setUnits([])
      setLeaseholders([])

      toast.success(`Successfully sent ${messageType} to ${recipients.length} recipient(s)`)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const filteredLogs = communicationLogs.filter(log => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      log.subject.toLowerCase().includes(searchLower) ||
      log.leaseholder_name?.toLowerCase().includes(searchLower) ||
      log.building_name?.toLowerCase().includes(searchLower) ||
      log.unit_number?.toLowerCase().includes(searchLower) ||
      log.type.toLowerCase().includes(searchLower)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'letter':
        return <FileText className="h-4 w-4" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'bg-blue-100 text-blue-700'
      case 'letter':
        return 'bg-purple-100 text-purple-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-[#4f46e5]">Communications</h1>
        <p className="text-gray-600 mt-2">Send email or letters to buildings, leaseholders, or your whole portfolio.</p>
      </div>

      {/* Message Composer */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Message Composer</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Target Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-700">Select Target</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send to:
              </label>
              <select
                value={selectedBuilding}
                onChange={(e) => handleBuildingChange(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
              >
                <option value="">Select Building</option>
                {buildings.map(building => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedBuilding && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit (Optional):
                </label>
                <select
                  value={selectedUnit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                >
                  <option value="">All Units</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.unit_number}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedUnit && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leaseholder (Optional):
                </label>
                <select
                  value={selectedLeaseholder}
                  onChange={(e) => setSelectedLeaseholder(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
                >
                  <option value="">All Leaseholders</option>
                  {leaseholders.map(leaseholder => (
                    <option key={leaseholder.id} value={leaseholder.id}>
                      {leaseholder.name} ({leaseholder.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Recipients:</strong> {getRecipientCount()} {getRecipientCount() === 1 ? 'person' : 'people'}
              </p>
            </div>
          </div>

          {/* Message Type and Content */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose Type:
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="email"
                    checked={messageType === 'email'}
                    onChange={(e) => setMessageType(e.target.value as 'email' | 'letter')}
                    className="mr-2"
                  />
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="letter"
                    checked={messageType === 'letter'}
                    onChange={(e) => setMessageType(e.target.value as 'email' | 'letter')}
                    className="mr-2"
                  />
                  <FileText className="h-4 w-4 mr-1" />
                  Letter
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message:
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Enter your message..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
              />
            </div>

            <button
              onClick={handleSendMessage}
              disabled={isSending || getRecipientCount() === 0}
              className="w-full bg-[#4f46e5] text-white py-3 px-6 rounded-lg hover:bg-[#4338ca] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSending ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send {messageType.charAt(0).toUpperCase() + messageType.slice(1)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Communication Log */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Communication Log</h2>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <Filter className="h-4 w-4" />
              Filters
              {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Search and Filters */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search communications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4f46e5] focus:border-transparent"
              />
            </div>
          </div>

          {/* Communication Log Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg shadow">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent At
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(log.type)}`}>
                        {getTypeIcon(log.type)}
                        {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{log.leaseholder_name || 'Unknown'}</div>
                        <div className="text-gray-500 text-xs">
                          {log.building_name} / {log.unit_number}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate" title={log.subject}>
                        {log.subject}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {formatDate(log.sent_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            // View message details
                            console.log('View message:', log)
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {log.type === 'letter' && (
                          <button
                            onClick={() => {
                              // Download letter PDF
                              console.log('Download letter:', log)
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No communications found</h3>
              <p className="text-gray-500">Start sending messages to see them appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 