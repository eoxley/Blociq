'use client'
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
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

  // New state for leaseholder functionality
  const [leaseholderCount, setLeaseholderCount] = useState<number>(0)
  const [sendingToLeaseholders, setSendingToLeaseholders] = useState(false)
  const [sendResults, setSendResults] = useState<{
    success: boolean
    successful: any[]
    failed: any[]
    total_recipients: number
    success_rate: string
  } | null>(null)

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

  // Fetch leaseholder count when building changes
  useEffect(() => {
    if (sendForm.building_id) {
      fetchLeaseholderCount(sendForm.building_id)
    } else {
      setLeaseholderCount(0)
    }
  }, [sendForm.building_id])

  const fetchLeaseholderCount = async (buildingId: string) => {
    try {
      const { count, error } = await supabase
        .from('leaseholders')
        .select('*', { count: 'exact', head: true })
        .eq('building_id', parseInt(buildingId))

      if (!error && count !== null) {
        setLeaseholderCount(count)
      } else {
        setLeaseholderCount(0)
      }
    } catch (error) {
      console.error('Error fetching leaseholder count:', error)
      setLeaseholderCount(0)
    }
  }

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

  // New function for sending to all leaseholders
  const handleSendToAllLeaseholders = async () => {
    if (!selectedTemplate || !sendForm.building_id) {
      toast.error('Please select a template and building')
      return
    }

    setSendingToLeaseholders(true)
    setSendResults(null)

    try {
      const response = await fetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          building_id: sendForm.building_id,
          recipient_selection: 'all_leaseholders',
          method: 'email',
          subject: sendForm.subject || selectedTemplate.subject,
          custom_message: sendForm.custom_message || selectedTemplate.body,
          merge_data: sendForm.merge_data
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSendResults(data.results)
        
        if (data.results.failed.length === 0) {
          toast.success(`✅ All emails sent successfully! ${data.results.successful.length} leaseholders contacted.`)
        } else {
          toast.warning(`⚠️ ${data.results.successful.length} emails sent, ${data.results.failed.length} failed.`)
        }

        // Refresh communications log
        fetchCommunications()
      } else {
        toast.error(data.error || 'Failed to send to leaseholders')
      }
    } catch (error) {
      console.error('Error sending to leaseholders:', error)
      toast.error('Error sending to leaseholders')
    } finally {
      setSendingToLeaseholders(false)
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

  // Check if send to leaseholders button should be disabled
  const isSendToLeaseholdersDisabled = !selectedTemplate || !sendForm.building_id || sendingToLeaseholders

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#333333]">Communications</h1>
          <p className="text-[#64748B] mt-1">Manage templates and send communications to leaseholders</p>
        </div>
        <div className="flex items-center gap-3">
          <BlocIQButton
            onClick={() => setShowNewTemplateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Template
          </BlocIQButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <BlocIQCard>
          <BlocIQCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#64748B]">Total Communications</p>
                <p className="text-2xl font-bold text-[#333333]">{summary.total_communications}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-[#008C8F]" />
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard>
          <BlocIQCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#64748B]">Emails Sent</p>
                <p className="text-2xl font-bold text-[#333333]">{summary.email_count}</p>
              </div>
              <Mail className="h-8 w-8 text-[#008C8F]" />
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard>
          <BlocIQCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#64748B]">Buildings Contacted</p>
                <p className="text-2xl font-bold text-[#333333]">{summary.buildings_contacted}</p>
              </div>
              <Building className="h-8 w-8 text-[#008C8F]" />
            </div>
          </BlocIQCardContent>
        </BlocIQCard>

        <BlocIQCard>
          <BlocIQCardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#64748B]">Templates Used</p>
                <p className="text-2xl font-bold text-[#333333]">{summary.templates_used}</p>
              </div>
              <FileText className="h-8 w-8 text-[#008C8F]" />
            </div>
          </BlocIQCardContent>
        </BlocIQCard>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-[#F3F4F6] p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'templates'
              ? 'bg-white text-[#333333] shadow-sm'
              : 'text-[#64748B] hover:text-[#333333]'
          }`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('log')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            activeTab === 'log'
              ? 'bg-white text-[#333333] shadow-sm'
              : 'text-[#64748B] hover:text-[#333333]'
          }`}
        >
          Communication Log
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
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

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <BlocIQCard key={template.id} className="hover:shadow-lg transition-shadow">
                <BlocIQCardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#333333] mb-1">{template.name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <BlocIQBadge variant={getTypeColor(template.type)}>
                          {template.type}
                        </BlocIQBadge>
                                                 <BlocIQBadge variant="secondary">
                           {template.category}
                         </BlocIQBadge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTemplatePreview(template)}
                        className="p-1 hover:bg-[#F3F4F6] rounded transition-colors"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4 text-[#64748B]" />
                      </button>
                    </div>
                  </div>
                  {template.description && (
                    <p className="text-sm text-[#64748B] line-clamp-2">{template.description}</p>
                  )}
                </BlocIQCardHeader>
                <BlocIQCardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-[#64748B] mb-4">
                    <span>Used {template.usage_count || 0} times</span>
                    <span>Updated {formatDate(template.updated_at)}</span>
                  </div>
                  <div className="flex gap-2">
                    <BlocIQButton
                      onClick={() => handleUseTemplate(template)}
                      size="sm"
                      className="flex-1"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Use Template
                    </BlocIQButton>
                  </div>
                </BlocIQCardContent>
              </BlocIQCard>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-[#64748B] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#333333] mb-2">No templates found</h3>
              <p className="text-[#64748B] mb-4">Create your first template to get started</p>
              <BlocIQButton onClick={() => setShowNewTemplateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </BlocIQButton>
            </div>
          )}
        </div>
      )}

      {/* Communication Log Tab */}
      {activeTab === 'log' && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#008C8F] mx-auto mb-4" />
              <p className="text-[#64748B]">Loading communications...</p>
            </div>
          ) : communications.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-[#64748B] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[#333333] mb-2">No communications yet</h3>
              <p className="text-[#64748B]">Send your first communication to see it here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {communications.map((buildingGroup) => (
                <BlocIQCard key={buildingGroup.building_id}>
                  <BlocIQCardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-[#008C8F]" />
                        <div>
                          <h3 className="font-semibold text-[#333333]">{buildingGroup.building_name}</h3>
                          <p className="text-sm text-[#64748B]">{buildingGroup.building_address}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleBuildingExpansion(buildingGroup.building_id)}
                        className="p-2 hover:bg-[#F3F4F6] rounded-lg transition-colors"
                      >
                        {expandedBuildings.has(buildingGroup.building_id) ? (
                          <ChevronUp className="h-4 w-4 text-[#64748B]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#64748B]" />
                        )}
                      </button>
                    </div>
                  </BlocIQCardHeader>
                  {expandedBuildings.has(buildingGroup.building_id) && (
                    <BlocIQCardContent>
                      <div className="space-y-4">
                        {buildingGroup.communications.map((comm) => (
                          <div key={comm.id} className="border border-[#E2E8F0] rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-[#333333]">{comm.template_name}</h4>
                                  <BlocIQBadge variant={getMethodColor(comm.method)}>
                                    {comm.method}
                                  </BlocIQBadge>
                                  <BlocIQBadge variant={getStatusColor(comm.status)}>
                                    {comm.status}
                                  </BlocIQBadge>
                                </div>
                                <p className="text-sm text-[#64748B] mb-2">
                                  Sent {formatDate(comm.sent_at)} by {comm.sent_by}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-[#64748B]">
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
                  <p className="text-xs text-[#64748B] mb-2">Available merge fields: [leaseholder_name], [building_name], [building_address], [date], [manager_name]</p>
                </div>
                                  <textarea
                    required
                    value={templateForm.body}
                    onChange={(e) => setTemplateForm({...templateForm, body: e.target.value})}
                    rows={8}
                    className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C8F] focus:border-transparent font-mono text-sm"
                    placeholder="Enter your template content here. Use [leaseholder_name], [building_name], [date] etc. for merge fields..."
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

              {/* Leaseholder Count Display */}
              {sendForm.building_id && leaseholderCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">
                      {leaseholderCount} leaseholder{leaseholderCount !== 1 ? 's' : ''} will receive this communication
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">
                    This will send the communication to all leaseholders in the selected building.
                  </p>
                </div>
              )}

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

              {/* Send Results Display */}
              {sendResults && (
                <div className={`p-4 rounded-lg border ${
                  sendResults.failed.length === 0 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {sendResults.failed.length === 0 ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    <span className={`font-medium ${
                      sendResults.failed.length === 0 ? 'text-green-900' : 'text-yellow-900'
                    }`}>
                      {sendResults.failed.length === 0 
                        ? '✅ All emails sent successfully!' 
                        : `⚠️ ${sendResults.successful.length} emails sent, ${sendResults.failed.length} failed`
                      }
                    </span>
                  </div>
                  <div className="text-sm text-gray-700">
                    <p>Success Rate: {sendResults.success_rate}</p>
                    <p>Total Recipients: {sendResults.total_recipients}</p>
                  </div>
                  {sendResults.failed.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-yellow-900 mb-2">Failed Recipients:</p>
                      <div className="space-y-1">
                        {sendResults.failed.map((failure, index) => (
                          <div key={index} className="text-sm text-yellow-800">
                            {failure.name} ({failure.email}) - {failure.reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                
                {/* Send to All Leaseholders Button */}
                <BlocIQButton
                  type="button"
                  onClick={handleSendToAllLeaseholders}
                  disabled={isSendToLeaseholdersDisabled}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {sendingToLeaseholders ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {sendingToLeaseholders ? 'Sending to leaseholders...' : '📩 Send to All Leaseholders'}
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