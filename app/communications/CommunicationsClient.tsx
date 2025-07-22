'use client'
import React, { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Plus, 
  Mail, 
  FileText, 
  Send, 
  Search, 
  Filter, 
  Calendar, 
  Building, 
  Users, 
  Eye, 
  Edit3, 
  Trash2, 
  Download, 
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Bell,
  Archive,
  RefreshCw,
  Brain
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
import BlocIQLogo from '@/components/BlocIQLogo'
import { toast } from 'sonner'

interface UserData {
  name: string
  email: string
}

interface Template {
  id: string
  name: string
  description: string
  type: 'email' | 'letter' | 'notice'
  category: string
  body: string
  placeholders: string[]
  subject: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_used_at: string
  usage_count: number
}

interface Communication {
  id: string
  template_id: string
  template_name: string
  sent_by: string
  sent_at: string
  building_id: string
  building_name: string
  method: 'email' | 'pdf' | 'both'
  recipients: any[]
  subject: string
  body: string
  status: 'sent' | 'failed' | 'pending'
  error_message: string
  metadata: any
  communication_templates?: Template
  buildings?: any
  recipients: any[]
  recipient_count: number
}

interface BuildingGroup {
  building_id: string
  building_name: string
  building_address: string
  communications: Communication[]
}

interface CommunicationsClientProps {
  userData: UserData
}

export default function CommunicationsClient({ userData }: CommunicationsClientProps) {
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])
  const [communications, setCommunications] = useState<BuildingGroup[]>([])
  const [buildings, setBuildings] = useState<any[]>([])
  const [summary, setSummary] = useState({
    total_communications: 0,
    email_count: 0,
    pdf_count: 0,
    both_count: 0,
    successful_sends: 0,
    failed_sends: 0,
    buildings_contacted: 0,
    templates_used: 0,
    last_communication_date: null
  })

  // UI State
  const [activeTab, setActiveTab] = useState<'templates' | 'log'>('templates')
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    type: 'email' as 'email' | 'letter' | 'notice',
    category: 'general',
    body: '',
    subject: '',
    placeholders: [] as string[]
  })

  // Send form state
  const [sendForm, setSendForm] = useState({
    building_id: '',
    recipient_selection: 'all_leaseholders' as 'all_leaseholders' | 'all_residents' | 'specific_units',
    custom_message: '',
    method: 'email' as 'email' | 'pdf' | 'both',
    subject: '',
    merge_data: {} as any
  })

  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    category: '',
    method: '',
    status: ''
  })

  useEffect(() => {
    fetchTemplates()
    fetchCommunications()
    fetchBuildings()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/communications/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      } else {
        toast.error('Failed to fetch templates')
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Error fetching templates')
    }
  }

  const fetchCommunications = async () => {
    try {
      const response = await fetch('/api/communications/log')
      if (response.ok) {
        const data = await response.json()
        setCommunications(data.communications || [])
        setSummary(data.summary || {})
      } else {
        toast.error('Failed to fetch communications log')
      }
    } catch (error) {
      console.error('Error fetching communications:', error)
      toast.error('Error fetching communications log')
    } finally {
      setLoading(false)
    }
  }

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, address')
        .order('name')
      
      if (!error && data) {
        setBuildings(data)
      }
    } catch (error) {
      console.error('Error fetching buildings:', error)
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/communications/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm)
      })

      if (response.ok) {
        toast.success('Template created successfully!')
        setShowNewTemplateModal(false)
        setTemplateForm({
          name: '',
          description: '',
          type: 'email',
          category: 'general',
          body: '',
          subject: '',
          placeholders: []
        })
        fetchTemplates()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create template')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('Error creating template')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendCommunication = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplate) return

    setSubmitting(true)

    try {
      const response = await fetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          ...sendForm
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Communication sent successfully! ${data.summary.emails_sent} emails sent, ${data.summary.pdfs_generated} PDFs generated.`)
        setShowSendModal(false)
        setSendForm({
          building_id: '',
          recipient_selection: 'all_leaseholders',
          custom_message: '',
          method: 'email',
          subject: '',
          merge_data: {}
        })
        setSelectedTemplate(null)
        fetchCommunications()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to send communication')
      }
    } catch (error) {
      console.error('Error sending communication:', error)
      toast.error('Error sending communication')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleBuildingExpansion = (buildingId: string) => {
    const newExpanded = new Set(expandedBuildings)
    if (newExpanded.has(buildingId)) {
      newExpanded.delete(buildingId)
    } else {
      newExpanded.add(buildingId)
    }
    setExpandedBuildings(newExpanded)
  }

  const handleTemplatePreview = (template: Template) => {
    setSelectedTemplate(template)
    setShowTemplatePreview(true)
  }

  const handleUseTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setShowTemplatePreview(false)
    setShowSendModal(true)
    // Pre-fill the send form with template data
    setSendForm({
      ...sendForm,
      subject: template.subject,
      custom_message: template.body
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'default'
      case 'letter': return 'secondary'
      case 'notice': return 'warning'
      default: return 'default'
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'email': return 'default'
      case 'pdf': return 'secondary'
      case 'both': return 'warning'
      default: return 'default'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'success'
      case 'failed': return 'destructive'
      case 'pending': return 'warning'
      default: return 'default'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredTemplates = templates.filter(template => {
    if (filters.search && !template.name.toLowerCase().includes(filters.search.toLowerCase()) && 
        !template.description?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.type && template.type !== filters.type) return false
    if (filters.category && template.category !== filters.category) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-[#333333] mb-2">Loading Communications</h3>
          <p className="text-[#64748B]">Setting up your communication center...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#008C8F] to-[#7645ED] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <MessageSquare className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Communications</h1>
              <p className="text-white/90 text-lg">Template Library & Mail Merge</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BlocIQButton
              onClick={() => setShowNewTemplateModal(true)}
              variant="outline"
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
            >
              <Plus className="h-5 w-5 mr-2" />
              New Template
            </BlocIQButton>
            <BlocIQButton
              onClick={() => setShowSendModal(true)}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
            >
              <Send className="h-5 w-5 mr-2" />
              Send Message
            </BlocIQButton>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <BlocIQCard variant="elevated">
          <BlocIQCardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#333333]">{summary.total_communications}</div>
                <div className="text-sm text-[#64748B]">Total Sent</div>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard variant="elevated">
          <BlocIQCardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#2BBEB4] to-[#0F5D5D] rounded-xl flex items-center justify-center">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#333333]">{summary.email_count}</div>
                <div className="text-sm text-[#64748B]">Emails Sent</div>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard variant="elevated">
          <BlocIQCardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#2078F4] to-blue-600 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#333333]">{summary.pdf_count}</div>
                <div className="text-sm text-[#64748B]">PDFs Generated</div>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard variant="elevated">
          <BlocIQCardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#7645ED] to-purple-600 rounded-xl flex items-center justify-center">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#333333]">{summary.buildings_contacted}</div>
                <div className="text-sm text-[#64748B]">Buildings Contacted</div>
              </div>
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-[#F3F4F6] p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'templates'
              ? 'bg-white text-[#008C8F] shadow-sm'
              : 'text-[#64748B] hover:text-[#333333]'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FileText className="h-4 w-4" />
            Template Library
          </div>
        </button>
        <button
          onClick={() => setActiveTab('log')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'log'
              ? 'bg-white text-[#008C8F] shadow-sm'
              : 'text-[#64748B] hover:text-[#333333]'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Archive className="h-4 w-4" />
            Communication Log
          </div>
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Filters */}
          <BlocIQCard variant="elevated">
            <BlocIQCardContent className="p-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                    />
                  </div>
                </div>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({...filters, type: e.target.value})}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="email">Email</option>
                  <option value="letter">Letter</option>
                  <option value="notice">Notice</option>
                </select>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({...filters, category: e.target.value})}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  <option value="general">General</option>
                  <option value="welcome">Welcome</option>
                  <option value="section20">Section 20</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </BlocIQCardContent>
          </BlocIQCard>

          {/* Templates Grid */}
          {filteredTemplates.length === 0 ? (
            <BlocIQCard variant="elevated">
              <BlocIQCardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#333333] mb-2">No Templates Found</h3>
                <p className="text-[#64748B] mb-6">Create your first communication template to get started</p>
                <BlocIQButton onClick={() => setShowNewTemplateModal(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Create First Template
                </BlocIQButton>
              </BlocIQCardContent>
            </BlocIQCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <BlocIQCard key={template.id} variant="elevated" className="hover:shadow-lg transition-shadow">
                  <BlocIQCardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-[#333333]">{template.name}</h3>
                          <BlocIQBadge variant={getTypeColor(template.type)} size="sm">
                            {template.type}
                          </BlocIQBadge>
                        </div>
                        {template.description && (
                          <p className="text-sm text-[#64748B] mb-2">{template.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-[#64748B]">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {template.last_used_at ? formatDate(template.last_used_at) : 'Never used'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            {template.usage_count} uses
                          </div>
                        </div>
                      </div>
                    </div>
                  </BlocIQCardHeader>
                  <BlocIQCardContent>
                    <div className="space-y-3">
                      {template.placeholders.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-[#64748B] mb-1">Available merge fields:</p>
                          <div className="flex flex-wrap gap-1">
                            {template.placeholders.slice(0, 3).map((placeholder, index) => (
                              <span key={index} className="text-xs bg-[#F3F4F6] px-2 py-1 rounded text-[#64748B]">
                                {placeholder}
                              </span>
                            ))}
                            {template.placeholders.length > 3 && (
                              <span className="text-xs text-[#64748B]">+{template.placeholders.length - 3} more</span>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <BlocIQButton
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template)
                            setShowSendModal(true)
                          }}
                          className="flex-1"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Use Template
                        </BlocIQButton>
                        <BlocIQButton variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </BlocIQButton>
                      </div>
                    </div>
                  </BlocIQCardContent>
                </BlocIQCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Communication Log Tab */}
      {activeTab === 'log' && (
        <div className="space-y-6">
          {communications.length === 0 ? (
            <BlocIQCard variant="elevated">
              <BlocIQCardContent className="p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#008C8F] to-[#007BDB] rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Archive className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#333333] mb-2">No Communications Yet</h3>
                <p className="text-[#64748B] mb-6">Send your first communication to see it here</p>
                <BlocIQButton onClick={() => setShowSendModal(true)}>
                  <Send className="h-5 w-5 mr-2" />
                  Send First Message
                </BlocIQButton>
              </BlocIQCardContent>
            </BlocIQCard>
          ) : (
            <div className="space-y-6">
              {communications.map((building) => (
                <BlocIQCard key={building.building_id} variant="elevated">
                  <BlocIQCardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#008C8F] to-[#7645ED] rounded-xl flex items-center justify-center">
                          <Building className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-[#333333]">{building.building_name}</h2>
                          <p className="text-sm text-[#64748B]">{building.building_address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <BlocIQBadge variant="secondary">
                          {building.communications.length} {building.communications.length === 1 ? 'Communication' : 'Communications'}
                        </BlocIQBadge>
                        <BlocIQButton
                          variant="outline"
                          size="sm"
                          onClick={() => toggleBuildingExpansion(building.building_id)}
                        >
                          {expandedBuildings.has(building.building_id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </BlocIQButton>
                      </div>
                    </div>
                  </BlocIQCardHeader>

                  {expandedBuildings.has(building.building_id) && (
                    <BlocIQCardContent>
                      <div className="space-y-4">
                        {building.communications.map((comm) => (
                          <div key={comm.id} className="bg-[#FAFAFA] rounded-xl p-4 border border-[#E2E8F0]">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-lg font-semibold text-[#333333]">{comm.template_name}</h3>
                                  <BlocIQBadge variant={getMethodColor(comm.method)} size="sm">
                                    {comm.method}
                                  </BlocIQBadge>
                                  <BlocIQBadge variant={getStatusColor(comm.status)} size="sm">
                                    {comm.status}
                                  </BlocIQBadge>
                                </div>
                                {comm.subject && (
                                  <p className="text-sm text-[#64748B] mb-2">{comm.subject}</p>
                                )}
                                <div className="flex items-center gap-4 text-sm text-[#64748B]">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {formatDate(comm.sent_at)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {comm.recipient_count} recipients
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Recipients Preview */}
                            {comm.recipients.length > 0 && (
                              <div className="bg-white rounded-lg p-3 border border-[#E2E8F0]">
                                <div className="flex items-center gap-2 mb-2">
                                  <Users className="h-4 w-4 text-[#64748B]" />
                                  <span className="text-xs text-[#64748B]">
                                    Recipients ({comm.recipients.length})
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {comm.recipients.slice(0, 5).map((recipient, index) => (
                                    <span key={index} className="text-xs bg-[#F3F4F6] px-2 py-1 rounded text-[#64748B]">
                                      {recipient.recipient_name}
                                    </span>
                                  ))}
                                  {comm.recipients.length > 5 && (
                                    <span className="text-xs text-[#64748B]">+{comm.recipients.length - 5} more</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </BlocIQCardContent>
                  )}
                </BlocIQCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Template Modal */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#333333]">Create New Template</h2>
                <button
                  onClick={() => setShowNewTemplateModal(false)}
                  className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-[#64748B]" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateTemplate} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                    placeholder="e.g., Welcome Letter"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Type *
                  </label>
                  <select
                    required
                    value={templateForm.type}
                    onChange={(e) => setTemplateForm({...templateForm, type: e.target.value as any})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  >
                    <option value="email">Email</option>
                    <option value="letter">Letter</option>
                    <option value="notice">Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Category
                  </label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({...templateForm, category: e.target.value})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  >
                    <option value="general">General</option>
                    <option value="welcome">Welcome</option>
                    <option value="section20">Section 20</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                {templateForm.type === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-[#333333] mb-2">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                      placeholder="Subject line for emails"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">
                  Description
                </label>
                <textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({...templateForm, description: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  placeholder="Brief description of this template..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">
                  Template Body *
                </label>
                <div className="bg-[#F3F4F6] p-3 rounded-lg mb-2">
                  <p className="text-xs text-[#64748B] mb-2">Available merge fields: {{name}}, {{unit}}, {{building}}, {{building_address}}, {{date}}, {{recipient_type}}</p>
                </div>
                <textarea
                  required
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({...templateForm, body: e.target.value})}
                  rows={8}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent font-mono text-sm"
                  placeholder="Enter your template content here. Use {{name}}, {{unit}}, {{building}} etc. for merge fields..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <BlocIQButton
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewTemplateModal(false)}
                >
                  Cancel
                </BlocIQButton>
                <BlocIQButton
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? 'Creating...' : 'Create Template'}
                </BlocIQButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Communication Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#333333]">Send Communication</h2>
                <button
                  onClick={() => setShowSendModal(false)}
                  className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-[#64748B]" />
                </button>
              </div>
              {selectedTemplate && (
                <p className="text-[#64748B] mt-2">Template: {selectedTemplate.name}</p>
              )}
            </div>

            <form onSubmit={handleSendCommunication} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Building *
                  </label>
                  <select
                    required
                    value={sendForm.building_id}
                    onChange={(e) => setSendForm({...sendForm, building_id: e.target.value})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  >
                    <option value="">Select a building</option>
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Recipients *
                  </label>
                  <select
                    required
                    value={sendForm.recipient_selection}
                    onChange={(e) => setSendForm({...sendForm, recipient_selection: e.target.value as any})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  >
                    <option value="all_leaseholders">All Leaseholders</option>
                    <option value="all_residents">All Residents</option>
                    <option value="specific_units">Specific Units</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#333333] mb-2">
                    Send Method *
                  </label>
                  <select
                    required
                    value={sendForm.method}
                    onChange={(e) => setSendForm({...sendForm, method: e.target.value as any})}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  >
                    <option value="email">Email Only</option>
                    <option value="pdf">PDF Only</option>
                    <option value="both">Email & PDF</option>
                  </select>
                </div>

                {selectedTemplate?.type === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-[#333333] mb-2">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      value={sendForm.subject}
                      onChange={(e) => setSendForm({...sendForm, subject: e.target.value})}
                      className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                      placeholder={selectedTemplate?.subject || "Enter subject line"}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#333333] mb-2">
                  Additional Message (Optional)
                </label>
                <textarea
                  value={sendForm.custom_message}
                  onChange={(e) => setSendForm({...sendForm, custom_message: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent"
                  placeholder="Add any additional message or instructions..."
                />
              </div>

              {selectedTemplate && (
                <div className="bg-[#F3F4F6] p-4 rounded-xl">
                  <h4 className="font-medium text-[#333333] mb-2">Template Preview</h4>
                  <div className="bg-white p-3 rounded-lg border border-[#E2E8F0]">
                    <div className="text-sm text-[#64748B] mb-1">Subject: {sendForm.subject || selectedTemplate.subject || 'No subject'}</div>
                    <div className="text-sm text-[#333333] whitespace-pre-line">
                      {selectedTemplate.body}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <BlocIQButton
                  type="button"
                  variant="outline"
                  onClick={() => setShowSendModal(false)}
                >
                  Cancel
                </BlocIQButton>
                <BlocIQButton
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? 'Sending...' : 'Send Communication'}
                </BlocIQButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 