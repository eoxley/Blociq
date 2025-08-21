'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
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
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  Plus,
  Filter,
  ChevronDown,
  ChevronUp,
  Brain,
  Sparkles,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Activity,
  Bell
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabaseClient'
import AIGenerateModal from '@/components/communications/AIGenerateModal'
import BatchGroupModal from '@/components/communications/BatchGroupModal'

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
  const [showAIModal, setShowAIModal] = useState(false)
  const [showBatchGroupModal, setShowBatchGroupModal] = useState(false)

  // Message composer state
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [selectedLeaseholder, setSelectedLeaseholder] = useState<string>('')
  const [messageType, setMessageType] = useState<'email' | 'letter'>('email')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')

  // Debug logging for modal states
  useEffect(() => {
    console.log('[CommunicationsPage] Modal states:', {
      showAIModal,
      showBatchGroupModal
    });
  }, [showAIModal, showBatchGroupModal]);

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
        // Don't show error toast for missing table, just set empty array
        if (error.code === '42703') {
          console.log('communications_log table may not exist yet, setting empty array')
          setCommunicationLogs([])
          return
        }
        toast.error('Failed to load communication logs')
        return
      }

      setCommunicationLogs(logs || [])
    } catch (error) {
      console.error('Error loading communication logs:', error)
      // Set empty array on any error to prevent UI issues
      setCommunicationLogs([])
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

  const getRecipientCountForAI = () => {
    if (selectedLeaseholder) return 1
    if (selectedUnit) return leaseholders.length
    if (selectedBuilding) {
      // For AI generation, we can estimate based on building selection
      return leaseholders.length || 1 // Default to 1 if no specific count available
    }
    return 1 // Default to 1 for AI generation even if no recipients selected
  }

  const handleAIGenerate = (generatedSubject: string, generatedContent: string) => {
    setSubject(generatedSubject)
    setContent(generatedContent)
    toast.success('AI-generated content applied to your message!')
  }

  const handleBatchGroupCreated = (groupName: string, recipients: any[]) => {
    // For now, we'll just show a success message
    // In a real implementation, you might want to save this group for future use
    toast.success(`Created group "${groupName}" with ${recipients.length} members`)
    console.log('Created batch group:', { groupName, recipients })
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
                building_name: recipient.unit?.building?.name || 'Unknown',
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
                building_name: recipient.unit?.building?.name || 'Unknown',
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

  // Calculate statistics
  const totalCommunications = communicationLogs.length
  const emailCount = communicationLogs.filter(log => log.type === 'email').length
  const letterCount = communicationLogs.filter(log => log.type === 'letter').length
  const recentCommunications = communicationLogs.filter(log => {
    const logDate = new Date(log.sent_at)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return logDate > weekAgo
  }).length

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-pulse">
          <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl mb-6"></div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded-lg w-1/3"></div>
            <div className="h-64 bg-white rounded-xl border border-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Main Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 mb-8 shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
          <div className="absolute top-1/2 right-0 w-24 h-24 bg-white rounded-full translate-x-12 -translate-y-12"></div>
          <div className="absolute bottom-0 left-1/3 w-20 h-20 bg-white rounded-full translate-y-10"></div>
        </div>

        <div className="relative px-8 py-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Communications Hub
              </h1>
              <p className="text-blue-100 text-lg">
                Send emails and letters to buildings, leaseholders, or your whole portfolio
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <Mail className="h-5 w-5 text-blue-300" />
              <span className="text-white font-medium">Email Management</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <FileText className="h-5 w-5 text-purple-300" />
              <span className="text-white font-medium">Letter Generation</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <Brain className="h-5 w-5 text-orange-300" />
              <span className="text-white font-medium">AI Assistance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Communications</p>
              <p className="text-2xl font-bold text-gray-900">{totalCommunications}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Mail className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Emails Sent</p>
              <p className="text-2xl font-bold text-green-600">{emailCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Letters Generated</p>
              <p className="text-2xl font-bold text-purple-600">{letterCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Week</p>
              <p className="text-2xl font-bold text-orange-600">{recentCommunications}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Message Composer Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-8 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Message Composer</h2>
                <p className="text-sm text-gray-600">Create and send communications to your portfolio</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Target Selection */}
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Building className="h-4 w-4 text-blue-600" />
                  Select Target
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Send to:
                    </label>
                    <select
                      value={selectedBuilding}
                      onChange={(e) => handleBuildingChange(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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

                                     <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                     <div className="flex items-center gap-2">
                       <Users className="h-4 w-4 text-blue-600" />
                       <p className="text-sm text-blue-700">
                         <strong>Recipients:</strong> {getRecipientCount()} {getRecipientCount() === 1 ? 'person' : 'people'}
                       </p>
                     </div>
                   </div>

                   {/* Create Batch Group Button */}
                   <button
                     onClick={() => {
                       console.log('[CommunicationsPage] Opening Batch Group Modal');
                       setShowBatchGroupModal(true);
                     }}
                     className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 px-6 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                   >
                     <Users className="h-5 w-5" />
                     Create Batch Group with AI
                   </button>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-gray-50 to-purple-50 rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                  Message Content
                </h3>
                
                <div className="space-y-4">
                  {/* Message Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
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
                        <Mail className="h-4 w-4 mr-1 text-blue-600" />
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
                        <FileText className="h-4 w-4 mr-1 text-purple-600" />
                        Letter
                      </label>
                    </div>
                  </div>

                  {/* AI Generate Button */}
                  <button
                    onClick={() => {
                      console.log('[CommunicationsPage] Opening AI Generate Modal');
                      setShowAIModal(true);
                    }}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-3 px-6 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Brain className="h-5 w-5" />
                    Generate with AI
                  </button>

                  {/* Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject:
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Enter subject..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message:
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={6}
                      placeholder="Enter your message..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white resize-none"
                    />
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSendMessage}
                    disabled={isSending || getRecipientCount() === 0}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSending ? (
                      <>
                        <Clock className="h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Send {messageType.charAt(0).toUpperCase() + messageType.slice(1)}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Document Templates</h2>
                <p className="text-sm text-gray-600">Create professional documents with AI assistance</p>
              </div>
            </div>
            <Link
              href="/communications/templates"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Manage Templates
            </Link>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Welcome Letters</h3>
                  <p className="text-sm text-gray-600">New leaseholder welcome packages</p>
                </div>
              </div>
              <Link
                href="/communications/templates?type=welcome_letter"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View Templates →
              </Link>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Notices</h3>
                  <p className="text-sm text-gray-600">Important building announcements</p>
                </div>
              </div>
              <Link
                href="/communications/templates?type=notice"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View Templates →
              </Link>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Forms</h3>
                  <p className="text-sm text-gray-600">Standard property forms</p>
                </div>
              </div>
              <Link
                href="/communications/templates?type=form"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View Templates →
              </Link>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">AI-Powered Document Generation</h3>
                <p className="text-sm text-gray-600">
                  Use our AI to automatically fill templates with building data, generate professional documents, and send them to recipients.
                </p>
              </div>
              <Link
                href="/communications/templates"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Try AI Generation
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Communication Log Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-green-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Communication Log</h2>
                <p className="text-sm text-gray-600">Track all your sent communications</p>
              </div>
            </div>
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
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search communications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
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
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No communications found</h3>
              <p className="text-gray-500">Start sending messages to see them appear here.</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Modal */}
      <AIGenerateModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerate={handleAIGenerate}
        messageType={messageType}
        recipientCount={getRecipientCountForAI()}
      />

      {/* Batch Group Modal */}
      <BatchGroupModal
        open={showBatchGroupModal}
        onClose={() => setShowBatchGroupModal(false)}
        onGroupCreated={handleBatchGroupCreated}
        buildings={buildings}
      />
    </div>
  )
} 