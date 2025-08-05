"use client";

import { useState, useEffect } from 'react';
import { X, Send, Save, Maximize2, Minimize2, Mail, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Email {
  id: string;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  body_preview: string | null;
  body_full: string | null;
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

interface ReplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: Email | null;
  action: 'reply' | 'reply-all' | 'forward';
}

type ReplyAction = 'reply' | 'reply-all' | 'forward';

export default function ReplyModal({ isOpen, onClose, email, action }: ReplyModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [signature, setSignature] = useState('');
  const [isAIGenerated, setIsAIGenerated] = useState(false);

  // Load user signature on mount
  useEffect(() => {
    const loadSignature = async () => {
      try {
        const response = await fetch('/api/get-signature');
        if (response.ok) {
          const data = await response.json();
          setSignature(data.signature);
        }
      } catch (error) {
        console.error('Error loading signature:', error);
      }
    };

    if (isOpen) {
      loadSignature();
    }
  }, [isOpen]);

  // Initialize form when email changes
  useEffect(() => {
    if (!email || !isOpen) return;

    let newTo: string[] = [];
    let newCc: string[] = [];
    let newSubject = '';

    switch (action) {
      case 'reply':
        newTo = [email.from_email || ''];
        newSubject = email.subject?.startsWith('RE:') ? email.subject : `RE: ${email.subject}`;
        break;
      case 'reply-all':
        // For reply-all, we'd need to parse the original email headers
        // For now, just reply to sender
        newTo = [email.from_email || ''];
        newSubject = email.subject?.startsWith('RE:') ? email.subject : `RE: ${email.subject}`;
        break;
      case 'forward':
        newSubject = email.subject?.startsWith('FWD:') ? email.subject : `FWD: ${email.subject}`;
        break;
    }

    setTo(newTo);
    setCc(newCc);
    setSubject(newSubject || '');

    // Check for generated reply from AI
    const generatedReply = localStorage.getItem('generatedReply');
    const replyContext = localStorage.getItem('replyContext');
    
    if (action === 'reply' && generatedReply) {
      // Use the AI-generated reply
      setBody(generatedReply);
      setIsAIGenerated(true);
      // Clear the stored reply after using it
      localStorage.removeItem('generatedReply');
      localStorage.removeItem('replyContext');
    } else {
      setIsAIGenerated(false);
      // Set initial body with signature
      const originalMessage = email.body_full || email.body_preview || '';
      const quotedMessage = `\n\n--- Original Message ---\nFrom: ${email.from_name || email.from_email}\nDate: ${new Date(email.received_at || '').toLocaleString()}\nSubject: ${email.subject}\n\n${originalMessage}`;
      
      setBody(action === 'forward' ? quotedMessage : quotedMessage);
    }
  }, [email, action, isOpen]);

  const handleSend = async () => {
    if (!email || to.length === 0 || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          cc,
          subject: subject.trim(),
          body: body.trim(),
          relatedEmailId: action !== 'forward' ? email.id : null,
          status: 'sent'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      const data = await response.json();
      toast.success(data.message || 'Email sent successfully');
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!email || to.length === 0 || !subject.trim() || !body.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          cc,
          subject: subject.trim(),
          body: body.trim(),
          relatedEmailId: action !== 'forward' ? email.id : null,
          status: 'draft'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save draft');
      }

      const data = await response.json();
      toast.success(data.message || 'Draft saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePopOut = () => {
    // TODO: Implement pop-out functionality
    // This could open a new window or route to a dedicated compose page
    toast.info('Pop-out functionality coming soon');
  };

  const getActionLabel = () => {
    switch (action) {
      case 'reply': return 'Reply';
      case 'reply-all': return 'Reply All';
      case 'forward': return 'Forward';
      default: return 'Compose';
    }
  };

  const getActionIcon = () => {
    switch (action) {
      case 'reply': return <Mail className="h-4 w-4" />;
      case 'reply-all': return <Users className="h-4 w-4" />;
      case 'forward': return <Mail className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  if (!isOpen || !email) return null;

  return (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300 ease-in-out">
      <div className={`bg-white rounded-xl shadow-xl ${isFullscreen ? 'w-full h-full m-0' : 'max-w-4xl w-full mx-4 max-h-[90vh]'} overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {getActionIcon()}
            <h2 className="text-xl font-semibold text-gray-900">
              {getActionLabel()} to: {email.from_name || email.from_email}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* To Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">To</label>
            <input
              type="text"
              value={to.join(', ')}
              onChange={(e) => setTo(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder="Enter email addresses separated by commas"
            />
          </div>

          {/* CC Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">CC</label>
            <input
              type="text"
              value={cc.join(', ')}
              onChange={(e) => setCc(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder="Enter email addresses separated by commas"
            />
          </div>

          {/* Subject Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder="Enter subject"
            />
          </div>

          {/* Body Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
              rows={12}
              placeholder="Enter your message..."
            />
          </div>

          {/* Signature */}
          {signature && (
            <div className="text-sm text-gray-500 border-t border-gray-200 pt-2">
              <div className="whitespace-pre-wrap">{signature}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePopOut}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              Pop Out
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveDraft}
              disabled={isSaving}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 