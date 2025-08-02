'use client'

import { 
  Mail, Clock, User, RefreshCw, ExternalLink, ChevronDown, ChevronUp, History, 
  MessageSquare, Loader2, Send, Edit3, Check, Tag, Flag, Search, Filter, 
  Archive, Trash2, Star, MoreHorizontal, Reply, Forward, Delete, Pin, 
  Eye, EyeOff, Calendar, Building, AlertCircle, CheckCircle, Clock as ClockIcon,
  Wrench, Construction, Home, Save, X, Plus
} from 'lucide-react'

type Email = {
  id: string
  from_email: string | null
  subject: string | null
  body_preview: string | null
  received_at: string | null
  unread: boolean | null
  handled: boolean | null
  pinned: boolean | null
  flag_status: string | null
  categories: string[] | null
  building_id: number | null
  unit_id: number | null
  leaseholder_id: string | null
  buildings?: { name: string } | null
  units?: { unit_number: string } | null
  leaseholders?: { name: string; email: string } | null
}

interface EmailDetailViewProps {
  email: Email
  emailHistory: Email[]
  isLoadingHistory: boolean
  isGeneratingReply: boolean
  replyResponse?: string
  replyError?: string
  isEditingReply: boolean
  editedReply?: string
  isSendingEmail: boolean
  sendResult?: { success: boolean; message: string }
  onToggleFlag: (emailId: string, currentFlagStatus: string | null) => void
  onGenerateReply: (emailId: string, subject: string | null, bodyPreview: string | null) => void
  onEditReply: (emailId: string) => void
  onSaveEdit: (emailId: string) => void
  onSendEmail: (emailId: string, toEmail: string | null, subject: string | null) => void
  onCancelReply: () => void
  onUpdateEditedReply: (value: string) => void
  getSenderInitials: (email: string | null) => string
  formatDate: (dateString: string | null) => string
  getAssignmentLabel: (email: Email) => string
}

export default function EmailDetailView({
  email,
  emailHistory,
  isLoadingHistory,
  isGeneratingReply,
  replyResponse,
  replyError,
  isEditingReply,
  editedReply,
  isSendingEmail,
  sendResult,
  onToggleFlag,
  onGenerateReply,
  onEditReply,
  onSaveEdit,
  onSendEmail,
  onCancelReply,
  onUpdateEditedReply,
  getSenderInitials,
  formatDate,
  getAssignmentLabel
}: EmailDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Email Header */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {email.subject || 'No subject'}
              </h2>
              <div className="flex items-center gap-4 text-gray-600">
                <span className="font-medium">{email.from_email}</span>
                <span>•</span>
                <span>{formatDate(email.received_at)}</span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFlag(email.id, email.flag_status)}
              className={`p-3 rounded-xl transition-colors ${
                email.flag_status === 'flagged'
                  ? 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={email.flag_status === 'flagged' ? 'Unflag' : 'Flag'}
            >
              <Flag className="h-5 w-5" />
            </button>
            
            <button
              onClick={() => onGenerateReply(email.id, email.subject, email.body_preview)}
              disabled={isGeneratingReply}
              className="p-3 bg-teal-100 text-teal-600 rounded-xl hover:bg-teal-200 transition-colors disabled:opacity-50"
              title="Generate AI Reply"
            >
              {isGeneratingReply ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MessageSquare className="h-5 w-5" />
              )}
            </button>
            
            <button 
              className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
              title="Reply"
            >
              <Reply className="h-5 w-5" />
            </button>
            
            <button 
              className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
              title="Forward"
            >
              <Forward className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Status Badges */}
        <div className="flex items-center gap-3">
          {email.unread && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Unread
            </span>
          )}
          {email.handled && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Handled
            </span>
          )}
          {email.pinned && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Pinned
            </span>
          )}
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
            {getAssignmentLabel(email)}
          </span>
        </div>
      </div>

      {/* Email Content */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Content</h3>
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="prose max-w-none">
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
              {email.body_preview || 'No content available'}
            </p>
          </div>
        </div>
      </div>

      {/* AI Reply Section */}
      {replyResponse && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">AI Generated Reply</h3>
                <p className="text-gray-600">Review and edit before sending</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isEditingReply ? (
                <button
                  onClick={() => onEditReply(email.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-teal-600 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
              ) : (
                <button
                  onClick={() => onSaveEdit(email.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-teal-600 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  Save
                </button>
              )}
            </div>
          </div>
          
          {isEditingReply ? (
            <textarea
              value={editedReply || replyResponse}
              onChange={(e) => onUpdateEditedReply(e.target.value)}
              className="w-full p-4 border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              rows={12}
              placeholder="Edit your reply here..."
            />
          ) : (
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <div className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                {replyResponse}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={onCancelReply}
              className="inline-flex items-center gap-2 px-6 py-3 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            
            <button
              onClick={() => onSendEmail(email.id, email.from_email, email.subject)}
              disabled={isSendingEmail}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50"
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSendingEmail ? 'Sending...' : 'Send Reply'}
            </button>
          </div>

          {/* Send Result Message */}
          {sendResult && (
            <div className={`mt-4 p-4 rounded-xl ${
              sendResult.success 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {sendResult.message}
            </div>
          )}
        </div>
      )}

      {/* Generate Reply Error */}
      {replyError && (
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-6">
          <div className="flex items-center gap-3 text-red-700 mb-4">
            <AlertCircle className="h-6 w-6" />
            <span className="font-semibold">Error Generating Reply</span>
          </div>
          <div className="text-red-800 bg-red-50 p-4 rounded-xl">
            {replyError}
          </div>
        </div>
      )}

      {/* Email History */}
      {emailHistory.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-teal-600" />
            Correspondence History
          </h3>
          
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              <span className="ml-2 text-gray-600">Loading history...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {emailHistory.map((historicalEmail) => (
                <div
                  key={historicalEmail.id}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {historicalEmail.subject || 'No subject'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDate(historicalEmail.received_at)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {historicalEmail.body_preview || 'No preview available'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 