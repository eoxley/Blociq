"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Send, Save, Users, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { toPlainQuoted } from '@/utils/emailFormatting';

interface Email {
  id: string;
  from_email: string | null;
  from_name: string | null;
  to_email: string[] | null;
  cc_email: string[] | null;
  subject: string | null;
  body_preview: string | null;
  body_full: string | null;
  body_html?: string | null;
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

interface ReplyAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: Email | null;
  userEmail?: string;
}

export default function ReplyAllModal({ isOpen, onClose, email, userEmail }: ReplyAllModalProps) {
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [signature, setSignature] = useState('');
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const toInputRef = useRef<HTMLInputElement>(null);

  // Prevent background scrolling when modal is open and focus first input
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Focus the first input (To field) when modal opens
      setTimeout(() => {
        toInputRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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

    // For Reply All, include original sender and all recipients
    const originalSender = email.from_email;
    const originalRecipients = email.to_email || [];
    const originalCc = email.cc_email || [];
    
    // Filter out current user from recipients and CC
    const filteredRecipients = originalRecipients.filter(email => email !== userEmail);
    const filteredCc = originalCc.filter(email => email !== userEmail);
    
    // Set To field to original sender + filtered recipients
    const toField = [originalSender, ...filteredRecipients].filter(Boolean) as string[];
    setTo(toField);
    
    // Set CC field to filtered CC recipients
    setCc(filteredCc);
    
    // Set subject with Re: prefix
    const originalSubject = email.subject || '';
    setSubject(originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`);
    
    // Set body with quoted original
    const quoted = toPlainQuoted(email);
    setBody(`\n\n${quoted}`);
  }, [email, isOpen, userEmail]);

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
          relatedEmailId: email.id,
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
          relatedEmailId: email.id,
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

  if (!isOpen || !email) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/10 backdrop-blur-md">
      <div 
        role="dialog" 
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[840px] rounded-2xl bg-white shadow-xl max-h-[85vh] flex flex-col z-[101]"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4" />
              <h2 className="text-lg font-semibold text-gray-900">
                Reply All to: {email.from_name || email.from_email}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable Area */}
        <div className="flex-1 overflow-y-auto max-h-[70vh] overscroll-contain p-4 space-y-4">
          {/* To Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">To</label>
            <input
              ref={toInputRef}
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
                    
                    setIsGenerating(true);
                    try {
                      // Show loading state
                      setBody('Thinking...');
                      
                      const response = await fetch('/api/ask-ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          context_type: 'email_reply',
                          action_type: 'reply-all',
                          emailId: email.id,
                          building_id: email.building_id,
                          tone: 'Professional'
                        })
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.reply) {
                          const quoted = toPlainQuoted(email);
                          // Fill the textarea with the AI draft + quoted original, as plain text
                          setBody(`${data.reply.trim()}\n\n${quoted}`);
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
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={isAIGenerated || isGenerating}
                >
                  <Bot className="h-3 w-3" />
                  {isGenerating ? 'Generating...' : isAIGenerated ? 'AI Generated' : 'Generate AI Reply'}
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
                  {(() => {
                    const parts = body.split('--- Original Message ---');
                    return parts.map((part, index) => {
                      if (index === 0) {
                        // This is the new reply content - render as plain text
                        return (
                          <div key="new-content" className="mb-4">
                            <div className="whitespace-pre-wrap text-gray-900">
                              {part.trim()}
                            </div>
                          </div>
                        );
                      } else {
                        // This is the quoted content - render as plain text
                        return (
                          <details key="quoted-content" className="mt-4" open>
                            <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 mb-2">
                              📧 Original Message (click to expand/collapse)
                            </summary>
                            <div className="pl-4 border-l-2 border-gray-300 bg-white p-3 rounded">
                              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                {part.trim()}
                              </div>
                            </div>
                          </details>
                        );
                      }
                    });
                  })()}
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
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
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
  );
}
