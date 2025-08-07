"use client";

import { useState, useEffect } from 'react';
import { X, Send, Save, Maximize2, Minimize2, Mail, Users, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

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

// Function to sanitize and format original email content
const formatQuotedEmail = (email: Email): string => {
  const originalSender = email.from_name || email.from_email || 'Unknown sender';
  const originalDate = email.received_at ? new Date(email.received_at).toLocaleString() : 'Unknown date';
  const originalSubject = email.subject || 'No subject';
  
  // Get the original email content
  const originalContent = email.body_full || email.body_preview || '';
  
  // Use DOMPurify for consistent sanitization
  const sanitizedHtml = DOMPurify.sanitize(originalContent, {
    ALLOWED_TAGS: ['p', 'br', 'div', 'span', 'strong', 'em', 'u', 'b', 'i', 'a', 'ul', 'ol', 'li', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target'],
    FORBID_TAGS: ['html', 'head', 'meta', 'style', 'script', 'title', 'link', 'base', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button'],
    KEEP_CONTENT: true
  });
  
  // Additional cleanup for better formatting
  let cleanedContent = sanitizedHtml
    .replace(/<html[^>]*>.*?<body[^>]*>(.*?)<\/body>.*?<\/html>/gis, '$1') // Remove html/body tags
    .replace(/<head[^>]*>.*?<\/head>/gis, '') // Remove head tags
    .replace(/<meta[^>]*>/gi, '') // Remove meta tags
    .replace(/<style[^>]*>.*?<\/style>/gis, '') // Remove style tags
    .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove script tags
    .replace(/<title[^>]*>.*?<\/title>/gis, '') // Remove title tags
    .replace(/<link[^>]*>/gi, '') // Remove link tags
    .replace(/<base[^>]*>/gi, '') // Remove base tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '') // Remove iframe tags
    .replace(/<object[^>]*>.*?<\/object>/gis, '') // Remove object tags
    .replace(/<embed[^>]*>/gi, '') // Remove embed tags
    .replace(/<form[^>]*>.*?<\/form>/gis, '') // Remove form tags
    .replace(/<input[^>]*>/gi, '') // Remove input tags
    .replace(/<button[^>]*>.*?<\/button>/gis, '') // Remove button tags
    .replace(/<select[^>]*>.*?<\/select>/gis, '') // Remove select tags
    .replace(/<textarea[^>]*>.*?<\/textarea>/gis, '') // Remove textarea tags
    .replace(/<label[^>]*>.*?<\/label>/gis, '') // Remove label tags
    .replace(/<fieldset[^>]*>.*?<\/fieldset>/gis, '') // Remove fieldset tags
    .replace(/<legend[^>]*>.*?<\/legend>/gis, '') // Remove legend tags
    .replace(/<optgroup[^>]*>.*?<\/optgroup>/gis, '') // Remove optgroup tags
    .replace(/<option[^>]*>.*?<\/option>/gis, '') // Remove option tags
    .replace(/<datalist[^>]*>.*?<\/datalist>/gis, '') // Remove datalist tags
    .replace(/<output[^>]*>.*?<\/output>/gis, '') // Remove output tags
    .replace(/<progress[^>]*>.*?<\/progress>/gis, '') // Remove progress tags
    .replace(/<meter[^>]*>.*?<\/meter>/gis, '') // Remove meter tags
    .replace(/<canvas[^>]*>.*?<\/canvas>/gis, '') // Remove canvas tags
    .replace(/<svg[^>]*>.*?<\/svg>/gis, '') // Remove svg tags
    .replace(/<math[^>]*>.*?<\/math>/gis, '') // Remove math tags
    .replace(/<video[^>]*>.*?<\/video>/gis, '') // Remove video tags
    .replace(/<audio[^>]*>.*?<\/audio>/gis, '') // Remove audio tags
    .replace(/<source[^>]*>/gi, '') // Remove source tags
    .replace(/<track[^>]*>/gi, '') // Remove track tags
    .replace(/<map[^>]*>.*?<\/map>/gis, '') // Remove map tags
    .replace(/<area[^>]*>/gi, '') // Remove area tags
    .replace(/<table[^>]*>.*?<\/table>/gis, '') // Remove table tags
    .replace(/<thead[^>]*>.*?<\/thead>/gis, '') // Remove thead tags
    .replace(/<tbody[^>]*>.*?<\/tbody>/gis, '') // Remove tbody tags
    .replace(/<tfoot[^>]*>.*?<\/tfoot>/gis, '') // Remove tfoot tags
    .replace(/<tr[^>]*>.*?<\/tr>/gis, '') // Remove tr tags
    .replace(/<th[^>]*>.*?<\/th>/gis, '') // Remove th tags
    .replace(/<td[^>]*>.*?<\/td>/gis, '') // Remove td tags
    .replace(/<caption[^>]*>.*?<\/caption>/gis, '') // Remove caption tags
    .replace(/<colgroup[^>]*>.*?<\/colgroup>/gis, '') // Remove colgroup tags
    .replace(/<col[^>]*>/gi, '') // Remove col tags
    .replace(/<h[1-6][^>]*>.*?<\/h[1-6]>/gis, '') // Remove heading tags
    .replace(/<hr[^>]*>/gi, '') // Remove hr tags
    .replace(/<pre[^>]*>.*?<\/pre>/gis, '') // Remove pre tags
    .replace(/<code[^>]*>.*?<\/code>/gis, '') // Remove code tags
    .replace(/<kbd[^>]*>.*?<\/kbd>/gis, '') // Remove kbd tags
    .replace(/<samp[^>]*>.*?<\/samp>/gis, '') // Remove samp tags
    .replace(/<var[^>]*>.*?<\/var>/gis, '') // Remove var tags
    .replace(/<cite[^>]*>.*?<\/cite>/gis, '') // Remove cite tags
    .replace(/<q[^>]*>.*?<\/q>/gis, '') // Remove q tags
    .replace(/<abbr[^>]*>.*?<\/abbr>/gis, '') // Remove abbr tags
    .replace(/<acronym[^>]*>.*?<\/acronym>/gis, '') // Remove acronym tags
    .replace(/<dfn[^>]*>.*?<\/dfn>/gis, '') // Remove dfn tags
    .replace(/<del[^>]*>.*?<\/del>/gis, '') // Remove del tags
    .replace(/<ins[^>]*>.*?<\/ins>/gis, '') // Remove ins tags
    .replace(/<mark[^>]*>.*?<\/mark>/gis, '') // Remove mark tags
    .replace(/<small[^>]*>.*?<\/small>/gis, '') // Remove small tags
    .replace(/<sub[^>]*>.*?<\/sub>/gis, '') // Remove sub tags
    .replace(/<sup[^>]*>.*?<\/sup>/gis, '') // Remove sup tags
    .replace(/<time[^>]*>.*?<\/time>/gis, '') // Remove time tags
    .replace(/<wbr[^>]*>/gi, '') // Remove wbr tags
    .replace(/<ruby[^>]*>.*?<\/ruby>/gis, '') // Remove ruby tags
    .replace(/<rt[^>]*>.*?<\/rt>/gis, '') // Remove rt tags
    .replace(/<rp[^>]*>.*?<\/rp>/gis, '') // Remove rp tags
    .replace(/<bdi[^>]*>.*?<\/bdi>/gis, '') // Remove bdi tags
    .replace(/<bdo[^>]*>.*?<\/bdo>/gis, '') // Remove bdo tags
    .replace(/<span[^>]*>/gi, '') // Remove span opening tags
    .replace(/<\/span>/gi, '') // Remove span closing tags
    .replace(/<div[^>]*>/gi, '') // Remove div opening tags
    .replace(/<\/div>/gi, '') // Remove div closing tags
    .replace(/<p[^>]*>/gi, '') // Remove p opening tags
    .replace(/<\/p>/gi, '\n') // Replace p closing tags with newlines
    .replace(/<br[^>]*>/gi, '\n') // Replace br tags with newlines
    .replace(/&nbsp;/gi, ' ') // Replace &nbsp; with spaces
    .replace(/&amp;/gi, '&') // Replace &amp; with &
    .replace(/&lt;/gi, '<') // Replace &lt; with <
    .replace(/&gt;/gi, '>') // Replace &gt; with >
    .replace(/&quot;/gi, '"') // Replace &quot; with "
    .replace(/&#39;/gi, "'") // Replace &#39; with '
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive newlines
    .trim();
  
  // Format the quoted message with proper structure
  const quotedMessage = `\n\n--- Original Message ---
From: ${originalSender}
Date: ${originalDate}
Subject: ${originalSubject}

${cleanedContent}`;
  
  return quotedMessage;
};

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
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/ask-ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          prompt: `Generate a professional email reply to this email: ${email.subject || 'No subject'}. Content: ${email.body_full || email.body_preview || ''}`,
                          building_id: email.building_id,
                          context_type: 'email_reply',
                          tone: 'Professional'
                        })
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.response) {
                          setBody(data.response);
                          setIsAIGenerated(true);
                          toast.success('AI reply generated!');
                        }
                      }
                    } catch (error) {
                      toast.error('Failed to generate AI reply');
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Bot className="h-3 w-3" />
                  Generate AI Reply
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
                onChange={(e) => setBody(e.target.value)}
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