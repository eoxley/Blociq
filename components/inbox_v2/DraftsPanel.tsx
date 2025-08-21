"use client"

import { useState } from 'react'
import { useDrafts, Draft } from '@/hooks/useDrafts'
import { 
  FileText, 
  Mail, 
  Reply, 
  Edit, 
  Trash2, 
  Building2, 
  Calendar,
  MoreVertical,
  Search,
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DraftsPanelProps {
  isOpen: boolean
  onClose: () => void
  onEditDraft: (draft: Draft) => void
  onSendDraft: (draft: Draft) => void
}

export default function DraftsPanel({ 
  isOpen, 
  onClose, 
  onEditDraft, 
  onSendDraft 
}: DraftsPanelProps) {
  const { 
    drafts, 
    isLoading, 
    error, 
    deleteDraft, 
    fetchDrafts 
  } = useDrafts()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'email' | 'reply'>('all')
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)

  const filteredDrafts = drafts.filter(draft => {
    const matchesSearch = draft.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         draft.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || draft.type === filterType
    return matchesSearch && matchesType
  })

  const handleDeleteDraft = async (draft: Draft) => {
    if (confirm(`Are you sure you want to delete this ${draft.type} draft?`)) {
      const success = await deleteDraft(draft.id, draft.type)
      if (success) {
        if (selectedDraft?.id === draft.id) {
          setSelectedDraft(null)
        }
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-GB', { 
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      })
    } else {
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    }
  }

  const getDraftIcon = (type: 'email' | 'reply') => {
    return type === 'email' ? <Mail className="h-4 w-4" /> : <Reply className="h-4 w-4" />
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">AI Generated Drafts</h2>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              {drafts.length} drafts
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search drafts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'email' | 'reply')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="email">Email Drafts</option>
              <option value="reply">Reply Drafts</option>
            </select>
            <button
              onClick={fetchDrafts}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Drafts List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                Loading drafts...
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-500">
                <p>Error loading drafts: {error}</p>
                <button
                  onClick={fetchDrafts}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            ) : filteredDrafts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                {searchQuery || filterType !== 'all' ? 'No drafts match your search.' : 'No drafts yet.'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-gray-50 transition-colors",
                      selectedDraft?.id === draft.id && "bg-blue-50 border-r-2 border-blue-600"
                    )}
                    onClick={() => setSelectedDraft(draft)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getDraftIcon(draft.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">
                            {draft.subject}
                          </h3>
                          <span className={cn(
                            "text-xs px-2 py-1 rounded-full",
                            draft.type === 'email' 
                              ? "bg-green-100 text-green-800" 
                              : "bg-blue-100 text-blue-800"
                          )}>
                            {draft.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                          {draft.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(draft.created_at)}
                          </span>
                          {draft.building_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {draft.building_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Draft Preview */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedDraft ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedDraft.subject}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        {getDraftIcon(selectedDraft.type)}
                        {selectedDraft.type === 'email' ? 'Email Draft' : 'Reply Draft'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(selectedDraft.created_at)}
                      </span>
                      {selectedDraft.building_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {selectedDraft.building_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEditDraft(selectedDraft)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => onSendDraft(selectedDraft)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Send
                    </button>
                    <button
                      onClick={() => handleDeleteDraft(selectedDraft)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>

                {selectedDraft.type === 'reply' && selectedDraft.original_email && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Original Email</h4>
                    <div className="text-sm text-gray-600">
                      <p><strong>From:</strong> {selectedDraft.original_email.from_email}</p>
                      <p><strong>Subject:</strong> {selectedDraft.original_email.subject}</p>
                      <p className="mt-2">{selectedDraft.original_email.body_preview}</p>
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-2">Draft Content</h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                      {selectedDraft.content}
                    </pre>
                  </div>
                </div>

                {selectedDraft.context && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Context</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <pre className="whitespace-pre-wrap text-sm text-gray-600 font-sans">
                        {selectedDraft.context}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-20">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Select a draft to preview</p>
                <p className="text-sm">Choose from the list on the left to view and edit your drafts</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
