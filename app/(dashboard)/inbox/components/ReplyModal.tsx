"use client";

import { useState, useEffect } from 'react';
import { X, Send, Save, Maximize2, Minimize2, Mail, Users, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import { sanitizeEmailContent, formatQuotedEmail } from '@/utils/email';
import { Card } from '@/components/ui/card';

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
      console.log('🤖 Using AI-generated reply');
    } else {
      setIsAIGenerated(false);
      // Use the formatted quoted message function
      const quotedMessage = formatQuotedEmail(email);
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
      // Sanitize the email body for safe sending
      const sanitizedBody = DOMPurify.sanitize(body.trim());
      
      const response = await fetch('/api/send-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reply_to_message_id: email.outlook_id || email.id,
          reply_text: sanitizedBody,
          to: to,
          cc: cc,
          subject: subject.trim(),
          building_id: email.building_id,
          user_id: email.user_id
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
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Message</label>
              <div className="flex items-center gap-2">
                {isAIGenerated && (
                  <div className="flex items-center gap-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    <Bot className="h-3 w-3" />
                    AI Generated
                  </div>
                )}
                {isAIGenerated && (
                  <Button
                    onClick={() => {
                      setBody('');
                      setIsAIGenerated(false);
                      toast.info('AI content cleared');
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-red-600 hover:text-red-700"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  onClick={async () => {
                    // Check if user has manually typed content
                    if (body.trim() && !isAIGenerated) {
                      const shouldOverwrite = confirm('You have manually typed content. Do you want to replace it with an AI-generated reply?');
                      if (!shouldOverwrite) {
                        return;
                      }
                    }
                    
                    // Store original body for potential restoration
                    const originalBody = body;
                    
                    try {
                      // Show loading state
                      setBody('Thinking...');
                      
                      const response = await fetch('/api/ask-ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          prompt: `Generate a professional email ${action} to this email: ${email.subject || 'No subject'}. Content: ${email.body_full || email.body_preview || ''}`,
                          building_id: email.building_id,
                          context_type: 'email_reply',
                          tone: 'Professional',
                          action_type: action
                        })
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.response) {
                          // For forward action, clean up the response
                          let aiResponse = data.response;
                          if (action === 'forward') {
                            // Remove any quoted content that might have been included
                            aiResponse = aiResponse.split('--- Original Message ---')[0]?.trim() || aiResponse;
                          }
                          
                          setBody(aiResponse);
                          setIsAIGenerated(true);
                          toast.success('AI reply generated!');
                        } else {
                          // Restore original body if AI generation failed
                          setBody(originalBody);
                          toast.error('Failed to generate AI reply');
                        }
                      } else {
                        // Restore original body if request failed
                        setBody(originalBody);
                        toast.error('Failed to generate AI reply');
                      }
                    } catch (error) {
                      // Restore original body on error
                      setBody(originalBody);
                      toast.error('Failed to generate AI reply');
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={isAIGenerated}
                >
                  <Bot className="h-3 w-3" />
                  {isAIGenerated ? 'AI Generated' : 'Generate AI Reply'}
                </Button>
              </div>
            </div>
            
            {/* Rich Text Editor */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center gap-2">
                <button
                  onClick={() => {
                    const textarea = document.getElementById('email-body') as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const text = textarea.value;
                      const before = text.substring(0, start);
                      const selection = text.substring(start, end);
                      const after = text.substring(end);
                      textarea.value = before + '<strong>' + selection + '</strong>' + after;
                      textarea.focus();
                      textarea.setSelectionRange(start + 8, end + 8);
                    }
                  }}
                  className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  B
                </button>
                <button
                  onClick={() => {
                    const textarea = document.getElementById('email-body') as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const text = textarea.value;
                      const before = text.substring(0, start);
                      const selection = text.substring(start, end);
                      const after = text.substring(end);
                      textarea.value = before + '<em>' + selection + '</em>' + after;
                      textarea.focus();
                      textarea.setSelectionRange(start + 4, end + 4);
                    }
                  }}
                  className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  I
                </button>
                <button
                  onClick={() => {
                    const textarea = document.getElementById('email-body') as HTMLTextAreaElement;
                    if (textarea) {
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const text = textarea.value;
                      const before = text.substring(0, start);
                      const selection = text.substring(start, end);
                      const after = text.substring(end);
                      textarea.value = before + '<u>' + selection + '</u>' + after;
                      textarea.focus();
                      textarea.setSelectionRange(start + 3, end + 3);
                    }
                  }}
                  className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                >
                  U
                </button>
              </div>
              <textarea
                id="email-body"
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  // Reset AI generated state if user manually edits
                  if (isAIGenerated && e.target.value !== body) {
                    setIsAIGenerated(false);
                  }
                }}
                className="w-full px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                rows={12}
                placeholder="Enter your message..."
              />
            </div>
            
            {/* Preview */}
            {body && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-2">Preview:</div>
                <div className="prose prose-sm max-w-none">
                  {body.split('--- Original Message ---').map((part, index) => {
                    if (index === 0) {
                      // This is the new reply content
                      return (
                        <div key="new-content" className="mb-4">
                          <div 
                            className="whitespace-pre-wrap text-gray-900"
                            dangerouslySetInnerHTML={{ 
                              __html: DOMPurify.sanitize(part.trim(), {
                                ALLOWED_TAGS: ['p', 'br', 'div', 'span', 'strong', 'em', 'u', 'b', 'i', 'a', 'ul', 'ol', 'li', 'blockquote'],
                                ALLOWED_ATTR: ['href', 'target']
                              })
                            }}
                          />
                        </div>
                      );
                    } else {
                      // This is the quoted content
                      const lines = part.trim().split('\n');
                      const headerLines = lines.slice(0, 3); // From, Date, Subject
                      const contentLines = lines.slice(3); // The actual quoted content
                      
                      return (
                        <details key="quoted-content" className="mt-4" open>
                          <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 mb-2">
                            📧 Original Message (click to expand/collapse)
                          </summary>
                          <div className="pl-4 border-l-2 border-gray-300 bg-white p-3 rounded">
                            {/* Header info */}
                            <div className="text-xs text-gray-500 mb-2 space-y-1">
                              {headerLines.map((line, lineIndex) => (
                                <div key={lineIndex}>{line}</div>
                              ))}
                            </div>
                            {/* Quoted content */}
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                              {contentLines.join('\n')}
                            </div>
                          </div>
                        </details>
                      );
                    }
                  })}
                </div>
              </div>
            )}
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