"use client";

import { useState } from 'react';
import { Mail, Flag, CheckCircle, Reply, Forward, Archive, Trash2, Clock, Building, User, Users, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { sanitizeHtml, processEmailHtml } from '@/utils/email';
import { useEmailAttachments } from '@/hooks/useEmailAttachments';

interface Email {
  id: string;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  body_preview: string | null;
  body_full: string | null;
  body_content_type?: string | null;
  received_at: string | null;
  unread: boolean | null;
  is_read: boolean | null;
  handled: boolean | null;
  is_handled: boolean | null;
  pinned: boolean | null;
  flag_status: string | null;
  categories: string[] | null;
  tags: string[] | null;
  building_id: number | null;
  unit_id: number | null;
  leaseholder_id: string | null;
  outlook_id: string | null;
  user_id: string | null;
  ai_tag?: string | null;
  triage_category?: string | null;
}

interface EnhancedEmailDetailViewProps {
  email: Email;
  onMarkAsRead?: (emailId: string) => Promise<void>;
  onMarkAsHandled?: (emailId: string) => Promise<void>;
  onFlagEmail?: (emailId: string, flagged: boolean) => Promise<void>;
  onReply?: (action: 'reply' | 'reply-all' | 'forward') => void;
  onDelete?: (emailId: string) => Promise<void>;
}

export default function EnhancedEmailDetailView({ 
  email, 
  onMarkAsRead, 
  onMarkAsHandled, 
  onFlagEmail,
  onReply,
  onDelete
}: EnhancedEmailDetailViewProps) {
  // Fetch email attachments for inline image support
  const { attachments, loading: attachmentsLoading } = useEmailAttachments(email.id);
  const [isHandling, setIsHandling] = useState(false);
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleMarkAsHandled = async () => {
    if (!onMarkAsHandled) return;
    
    setIsHandling(true);
    try {
      await onMarkAsHandled(email.id);
    } catch (error) {
      console.error('Error marking as handled:', error);
    } finally {
      setIsHandling(false);
    }
  };

  const handleFlagToggle = async () => {
    if (!onFlagEmail) return;
    
    const isCurrentlyFlagged = email.flag_status === 'flagged';
    await onFlagEmail(email.id, !isCurrentlyFlagged);
  };

  const handleReply = () => {
    onReply?.('reply');
  };

  const handleReplyAll = () => {
    onReply?.('reply-all');
  };

  const handleForward = () => {
    onReply?.('forward');
  };

  const generateDraftReply = async () => {
    setIsGeneratingReply(true);
    try {
      console.log('🤖 Generating AI reply for email:', email.id);
      
      const response = await fetch('/api/generate-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          emailId: email.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to generate reply`);
      }

      const data = await response.json();
      
      if (data.success && data.response) {
        // Store the generated reply in localStorage for the reply modal to access
        localStorage.setItem('generatedReply', data.response);
        localStorage.setItem('replyContext', JSON.stringify(data.context));
        
        // Open reply modal with generated content
        onReply?.('reply');
        toast.success('AI reply generated successfully!');
        console.log('✅ AI reply generated successfully');
      } else {
        throw new Error(data.error || 'No reply generated');
      }
    } catch (error) {
      console.error('❌ Error generating reply:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate AI reply');
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    if (confirm('Are you sure you want to delete this email? This action cannot be undone.')) {
      try {
        await onDelete(email.id);
        toast.success('Email deleted successfully');
      } catch (error) {
        console.error('Error deleting email:', error);
        toast.error('Failed to delete email');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Email Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {email.subject || '(No subject)'}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>{email.from_name || email.from_email || 'Unknown sender'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatDate(email.received_at)}</span>
              </div>
            </div>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center gap-2">
            {(email.unread || !email.is_read) && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                Unread
              </span>
            )}
            {email.flag_status === 'flagged' && (
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                Flagged
              </span>
            )}
            {(email.handled || email.is_handled) && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                Handled
              </span>
            )}
          </div>
        </div>
      </div>

             {/* Email Content */}
       <div className="space-y-4">
         {/* Building/Unit Info - Only show if we have building_id */}
         {email.building_id && (
           <div className="bg-gray-50 rounded-lg p-4 space-y-2">
             <h3 className="font-medium text-gray-900">Related Information</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
               <div className="flex items-center gap-2">
                 <Building className="h-4 w-4 text-gray-500" />
                 <span className="text-gray-700">Building ID: {email.building_id}</span>
               </div>
               {email.unit_id && (
                 <div className="flex items-center gap-2">
                   <span className="text-gray-500">🏠</span>
                   <span className="text-gray-700">Unit ID: {email.unit_id}</span>
                 </div>
               )}
               {email.leaseholder_id && (
                 <div className="flex items-center gap-2">
                   <User className="h-4 w-4 text-gray-500" />
                   <span className="text-gray-700">Leaseholder ID: {email.leaseholder_id}</span>
                 </div>
               )}
             </div>
           </div>
         )}

        {/* Email Body */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Message</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            {email.body_full ? (
              email.body_content_type === 'html' ? (
                <div 
                  className="prose max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: processEmailHtml(email.body_full, attachments) }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-gray-700">
                  {email.body_full}
                </div>
              )
            ) : email.body_preview ? (
              <div className="text-gray-700">
                {email.body_preview}
                <p className="text-gray-500 text-sm mt-2">
                  (Full message not available)
                </p>
              </div>
            ) : (
              <p className="text-gray-500 italic">No message content available</p>
            )}
          </div>
        </div>

                 {/* Categories/Tags */}
         {(email.categories || email.tags || email.ai_tag || email.triage_category) && (
           <div className="space-y-2">
             <h3 className="font-medium text-gray-900">Categories & Tags</h3>
             <div className="flex flex-wrap gap-2">
               {email.categories?.map((category, index) => (
                 <span
                   key={index}
                   className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs"
                 >
                   {category}
                 </span>
               ))}
               {email.tags?.map((tag, index) => (
                 <span
                   key={index}
                   className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                 >
                   {tag}
                 </span>
               ))}
               {email.ai_tag && (
                 <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                   AI: {email.ai_tag}
                 </span>
               )}
               {email.triage_category && (
                 <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs">
                   Triage: {email.triage_category}
                 </span>
               )}
             </div>
           </div>
         )}
      </div>

      {/* Action Buttons */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleReply}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Reply className="h-4 w-4" />
              Reply
            </Button>
            <Button
              onClick={handleReplyAll}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Reply All
            </Button>
            <Button
              onClick={handleForward}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Forward className="h-4 w-4" />
              Forward
            </Button>
            <Button
              onClick={generateDraftReply}
              disabled={isGeneratingReply}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-indigo-500 hover:from-indigo-600 hover:to-purple-700"
            >
              {isGeneratingReply ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              {isGeneratingReply ? 'Generating...' : '✍️ Generate Reply'}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleFlagToggle}
              variant={email.flag_status === 'flagged' ? 'default' : 'outline'}
              size="sm"
              className="flex items-center gap-2"
            >
              <Flag className="h-4 w-4" />
              {email.flag_status === 'flagged' ? 'Unflag' : 'Flag'}
            </Button>
            
            {!email.handled && !email.is_handled && (
              <Button
                onClick={handleMarkAsHandled}
                disabled={isHandling}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {isHandling ? 'Marking...' : 'Mark Handled'}
              </Button>
            )}

            <Button
              onClick={handleDelete}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 