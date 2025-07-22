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
  Building,
  Users,
  Calendar
} from 'lucide-react'
import { BlocIQButton } from '@/components/ui/blociq-button'
import { BlocIQCard, BlocIQCardContent, BlocIQCardHeader } from '@/components/ui/blociq-card'
import { BlocIQBadge } from '@/components/ui/blociq-badge'
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

interface Building {
  id: string
  name: string
  address: string
  units?: any[]
}

interface CommunicationsClientProps {
  userData: UserData
}

export default function CommunicationsClientNew({ userData }: CommunicationsClientProps) {
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  
  // Modal states
  const [showTemplatePreview, setShowTemplatePreview] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  
  // Send form state
  const [sendForm, setSendForm] = useState({
    building_id: '',
    recipient_selection: 'all_leaseholders' as 'all_leaseholders' | 'all_residents' | 'specific_units',
    custom_message: '',
    method: 'email' as 'email' | 'pdf' | 'both',
    subject: '',
    merge_data: {} as any
  })

  useEffect(() => {
    fetchTemplates()
    fetchBuildings()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching templates:', error)
        toast.error('Failed to fetch templates')
      } else {
        setTemplates(data || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Error fetching templates')
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

  const handleSendCommunication = async () => {
    try {
      if (!selectedTemplate || !sendForm.building_id) {
        toast.error('Please select a template and building')
        return
      }

      const response = await fetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          building_id: sendForm.building_id,
          recipient_selection: sendForm.recipient_selection,
          method: sendForm.method,
          subject: sendForm.subject,
          custom_message: sendForm.custom_message,
          merge_data: sendForm.merge_data
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Communication sent successfully! ${result.recipient_count} recipients contacted.`)
        setShowSendModal(false)
        setSelectedTemplate(null)
        // Refresh templates to update usage count
        fetchTemplates()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to send communication')
      }
    } catch (error) {
      console.error('Error sending communication:', error)
      toast.error('Error sending communication')
    }
  }

  // Filter templates based on search and filters
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory
    const matchesType = filterType === 'all' || template.type === filterType
    
    return matchesSearch && matchesCategory && matchesType
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'letter': return 'bg-green-100 text-green-800 border-green-200'
      case 'notice': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Complaints': return 'bg-red-100 text-red-800 border-red-200'
      case 'Notices': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Reminders': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'General': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const highlightPlaceholders = (content: string) => {
    return content.replace(/\[([^\]]+)\]/g, '<span class="bg-yellow-200 px-1 rounded text-yellow-800 font-medium">[$1]</span>')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading communication templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Communications</h1>
          <p className="mt-2 text-gray-600">Manage and send communication templates to leaseholders and residents</p>
        </div>
        <div className="flex items-center gap-3">
          <BlocIQButton
            onClick={() => setShowSendModal(true)}
            className="bg-gradient-to-r from-teal-600 to-blue-600 text-white hover:from-teal-700 hover:to-blue-700"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Communication
          </BlocIQButton>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="Complaints">Complaints</option>
            <option value="Notices">Notices</option>
            <option value="Reminders">Reminders</option>
            <option value="General">General</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="email">Email</option>
            <option value="letter">Letter</option>
            <option value="notice">Notice</option>
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <BlocIQCard key={template.id} className="group hover:shadow-lg transition-all duration-300">
            <BlocIQCardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-blue-600 rounded-lg flex items-center justify-center">
                    {template.type === 'email' ? (
                      <Mail className="h-5 w-5 text-white" />
                    ) : template.type === 'letter' ? (
                      <FileText className="h-5 w-5 text-white" />
                    ) : (
                      <Bell className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </div>
                </div>
              </div>
            </BlocIQCardHeader>
            
            <BlocIQCardContent className="pt-0">
              <div className="space-y-4">
                {/* Badges */}
                <div className="flex items-center gap-2">
                  <BlocIQBadge className={getTypeColor(template.type)}>
                    {template.type}
                  </BlocIQBadge>
                  <BlocIQBadge className={getCategoryColor(template.category)}>
                    {template.category}
                  </BlocIQBadge>
                </div>

                {/* Subject */}
                <div>
                  <p className="text-sm font-medium text-gray-700">Subject:</p>
                  <p className="text-sm text-gray-600 truncate">{template.subject}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(template.updated_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    <span>{template.usage_count || 0} sent</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <BlocIQButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleTemplatePreview(template)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </BlocIQButton>
                  <BlocIQButton
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                    className="flex-1 bg-teal-600 text-white hover:bg-teal-700"
                  >
                    <Send className="h-4 w-4 mr-1" />
                    Use
                  </BlocIQButton>
                </div>
              </div>
            </BlocIQCardContent>
          </BlocIQCard>
        ))}
      </div>

      {/* Template Preview Modal */}
      {showTemplatePreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Template Preview</h2>
                <button
                  onClick={() => setShowTemplatePreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Template Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <BlocIQBadge className={getTypeColor(selectedTemplate.type)}>
                      {selectedTemplate.type}
                    </BlocIQBadge>
                    <BlocIQBadge className={getCategoryColor(selectedTemplate.category)}>
                      {selectedTemplate.category}
                    </BlocIQBadge>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{selectedTemplate.name}</h3>
                  <p className="text-gray-600 mb-4">{selectedTemplate.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Last updated: {formatDate(selectedTemplate.updated_at)}</span>
                    <span>Used {selectedTemplate.usage_count || 0} times</span>
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Subject</h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <p className="text-gray-700">{selectedTemplate.subject}</p>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Content</h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div 
                      className="prose max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: highlightPlaceholders(selectedTemplate.body) 
                      }}
                    />
                  </div>
                </div>

                {/* Placeholders */}
                {selectedTemplate.placeholders && selectedTemplate.placeholders.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Dynamic Placeholders</h4>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 mb-2">
                        The following placeholders will be automatically filled when sending:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTemplate.placeholders.map((placeholder, index) => (
                          <span 
                            key={index}
                            className="bg-yellow-200 px-2 py-1 rounded text-yellow-800 text-sm font-medium"
                          >
                            {placeholder}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <BlocIQButton
                    variant="outline"
                    onClick={() => setShowTemplatePreview(false)}
                    className="flex-1"
                  >
                    Close
                  </BlocIQButton>
                  <BlocIQButton
                    onClick={() => handleUseTemplate(selectedTemplate)}
                    className="flex-1 bg-teal-600 text-white hover:bg-teal-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Use This Template
                  </BlocIQButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Communication Modal */}
      {showSendModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Send Communication</h2>
                <button
                  onClick={() => setShowSendModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Template Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTemplate.name}</h3>
                  <p className="text-gray-600">{selectedTemplate.description}</p>
                </div>

                {/* Building Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Building
                  </label>
                  <select
                    value={sendForm.building_id}
                    onChange={(e) => setSendForm({...sendForm, building_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">Select a building...</option>
                    {buildings.map((building) => (
                      <option key={building.id} value={building.id}>
                        {building.name} - {building.address}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recipient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipients
                  </label>
                  <select
                    value={sendForm.recipient_selection}
                    onChange={(e) => setSendForm({...sendForm, recipient_selection: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="all_leaseholders">All Leaseholders</option>
                    <option value="all_residents">All Residents</option>
                    <option value="specific_units">Specific Units</option>
                  </select>
                </div>

                {/* Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Method
                  </label>
                  <select
                    value={sendForm.method}
                    onChange={(e) => setSendForm({...sendForm, method: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="email">Email</option>
                    <option value="pdf">Generate PDF Letter</option>
                    <option value="both">Email + PDF</option>
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={sendForm.subject}
                    onChange={(e) => setSendForm({...sendForm, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter subject line..."
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Content
                  </label>
                  <textarea
                    value={sendForm.custom_message}
                    onChange={(e) => setSendForm({...sendForm, custom_message: e.target.value})}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    placeholder="Enter your message..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  <BlocIQButton
                    variant="outline"
                    onClick={() => setShowSendModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </BlocIQButton>
                  <BlocIQButton
                    onClick={handleSendCommunication}
                    className="flex-1 bg-teal-600 text-white hover:bg-teal-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Communication
                  </BlocIQButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 