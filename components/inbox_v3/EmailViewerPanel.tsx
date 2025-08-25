'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Clock, 
  Building2, 
  User, 
  Send, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Flag,
  Archive
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Email {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_email: string;
  body_preview: string | null;
  body_full?: string | null;
  received_at: string;
  unread: boolean;
  handled: boolean;
  building_id: string | null;
  building_name?: string;
  tags?: string[];
}

interface EmailViewerPanelProps {
  email: Email | null;
  onMarkAsRead: (emailId: string) => void;
  onMarkAsHandled: (emailId: string) => void;
  onFlagEmail: (emailId: string) => void;
  onReplySent: (emailId: string, replyText: string) => void;
}

export default function EmailViewerPanel({
  email,
  onMarkAsRead,
  onMarkAsHandled,
  onFlagEmail,
  onReplySent
}: EmailViewerPanelProps) {
  const [replyText, setReplyText] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [triageAction, setTriageAction] = useState<string>('');

  useEffect(() => {
    if (email) {
      setReplyText('');
      setShowTriageModal(false);
      setTriageAction('');
    }
  }, [email]);

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Mail className="h-16 w-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">Select an email to view</p>
        <p className="text-sm">Choose an email from the list to read and reply</p>
      </div>
    );
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const generateAIDraft = async () => {
    if (!email) return;

    setIsGeneratingDraft(true);
    try {
      const response = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: email.subject || '',
          body: email.body_full || email.body_preview || '',
          building_id: email.building_id,
          from_email: email.from_email,
          from_name: email.from_name
        })
      });

      if (response.ok) {
        const data = await response.json();
        setReplyText(data.reply);
      } else {
        console.error('Failed to generate draft');
      }
    } catch (error) {
      console.error('Error generating draft:', error);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleSendReply = async () => {
    if (!email || !replyText.trim()) return;

    setIsSending(true);
    try {
      // Simulate sending (in production, this would call your email API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mark email as handled
      onMarkAsHandled(email.id);
      
      // Show triage modal
      setShowTriageModal(true);
      
      // Notify parent component
      onReplySent(email.id, replyText);
      
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleTriageAction = (action: string) => {
    setTriageAction(action);
    setShowTriageModal(false);
    
    // In production, you would handle different triage actions here
    // For now, we'll just log the action
    console.log('Triage action selected:', action);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Email Header */}
      <div className="border-b border-gray-200 p-6 bg-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {email.subject || 'No Subject'}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  {email.from_name || email.from_email}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatTimeAgo(email.received_at)}</span>
              </div>
              
              {email.building_name && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{email.building_name}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {email.unread ? (
              <button
                onClick={() => onMarkAsRead(email.id)}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="Mark as read"
              >
                <Eye className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={() => onMarkAsRead(email.id)}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="Mark as unread"
              >
                <EyeOff className="h-5 w-5" />
              </button>
            )}
            
            {!email.handled && (
              <button
                onClick={() => onMarkAsHandled(email.id)}
                className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                title="Mark as handled"
              >
                <CheckCircle className="h-5 w-5" />
              </button>
            )}
            
            <button
              onClick={() => onFlagEmail(email.id)}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Flag email"
            >
              <Flag className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Tags */}
        {email.tags && email.tags.length > 0 && (
          <div className="flex gap-2">
            {email.tags.map((tag, index) => (
              <span
                key={index}
                className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="prose max-w-none">
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-gray-700 whitespace-pre-wrap">
              {email.body_full || email.body_preview || 'No content available'}
            </p>
          </div>
        </div>
      </div>

      {/* Reply Section */}
      <div className="border-t border-gray-200 p-6 bg-white">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-900">Reply</h3>
            <button
              onClick={generateAIDraft}
              disabled={isGeneratingDraft}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              {isGeneratingDraft ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isGeneratingDraft ? 'Generating...' : 'Generate AI Draft'}
            </button>
          </div>
          
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply here..."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleSendReply}
            disabled={!replyText.trim() || isSending}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSending ? 'Sending...' : 'Send Reply'}
          </button>
        </div>
      </div>

      {/* Triage Modal */}
      {showTriageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Post-Send Actions
            </h3>
            <p className="text-gray-600 mb-6">
              What would you like to do next with this email?
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleTriageAction('no-action')}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">No further action</div>
                <div className="text-sm text-gray-600">Mark as complete</div>
              </button>
              
              <button
                onClick={() => handleTriageAction('raise-task')}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Raise a task</div>
                <div className="text-sm text-gray-600">Create follow-up action item</div>
              </button>
              
              <button
                onClick={() => handleTriageAction('send-another')}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Send another reply</div>
                <div className="text-sm text-gray-600">Continue the conversation</div>
              </button>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowTriageModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
