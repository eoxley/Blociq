'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Send, Paperclip, Sparkles, ChevronDown, ChevronRight, Trash2, SendHorizonal } from 'lucide-react';
import { toPlainQuoted, sanitizeEmailHtml, looksLikeHtml } from '@/utils/emailFormatting';
import RichTextToolbar from './RichTextToolbar';
import { BiqPrimary, BiqSecondary } from '@/components/ui/biq-button';
import { toast } from 'sonner';
import { askBlocIQ } from '@/lib/ai/client';

interface Address {
  name?: string;
  email: string;
}

interface ReplyModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  email: any;
  action: 'reply' | 'reply-all' | 'forward';
  userEmail?: string | null;
}

export default function ReplyModalV2({ isOpen, onClose, email, action, userEmail }: ReplyModalV2Props) {
  const [replyHtml, setReplyHtml] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [toRecipients, setToRecipients] = useState('');
  const [ccRecipients, setCcRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [isPlainText, setIsPlainText] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  // Ensure the quoted block can be inserted once
  const quoted = useMemo(() => toPlainQuoted(email), [email]);

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

  // Helper functions
  function toPlain(input?: string) {
    if (!input) return '';
    return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function setEditorValue(text: string) {
    if (typeof setReplyHtml === 'function') return setReplyHtml(text);
    if (editorRef?.current?.innerHTML !== undefined) {
      editorRef.current.innerHTML = text;
      setReplyHtml(text);
    }
  }

  // Render the original email preview content (sanitised HTML or plain text)
  const originalHtml = email?.body_html ?? (looksLikeHtml(email?.body_full) ? email?.body_full : null);
  const cleanedHtml = originalHtml ? sanitizeEmailHtml(originalHtml) : null;

  // Helper functions for recipient normalization
  const normalizeRecipients = (raw: any): Address[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(item => {
        if (typeof item === 'string') {
          return { email: item };
        }
        return {
          name: item.name || item.displayName,
          email: item.email || item.address || item.emailAddress?.address
        };
      }).filter(item => item.email);
    }
    if (typeof raw === 'string') {
      return raw.split(',').map(email => ({ email: email.trim() })).filter(item => item.email);
    }
    return [];
  };

  const uniqueByEmail = (list: Address[]): Address[] => {
    const seen = new Set();
    return list.filter(item => {
      const key = item.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const excludeSelf = (list: Address[], selfEmail: string | null): Address[] => {
    if (!selfEmail) return list;
    return list.filter(item => item.email.toLowerCase() !== selfEmail.toLowerCase());
  };

  // Build initial fields based on action
  const buildInitialFields = useMemo(() => {
    if (!email) return { to: '', cc: '', subject: '' };

    const norm = normalizeRecipients;
    const unique = uniqueByEmail;
    const exclude = excludeSelf;

    switch (action) {
      case 'reply':
        return {
          to: email.from_email || '',
          cc: '',
          subject: email.subject?.startsWith('RE:') ? email.subject : `RE: ${email.subject || ''}`
        };

      case 'reply-all':
        const rawTo = norm(email.to_recipients || email.to);
        const rawCc = norm(email.cc_recipients || email.cc);
        const fromEmail = email.from_email ? [{ email: email.from_email }] : [];
        
        const allTo = unique([...rawTo, ...fromEmail]);
        const allCc = unique(rawCc);
        
        return {
          to: exclude(allTo, userEmail || null).map(a => a.email).join(', '),
          cc: exclude(allCc, userEmail || null).map(a => a.email).join(', '),
          subject: email.subject?.startsWith('RE:') ? email.subject : `RE: ${email.subject || ''}`
        };

      case 'forward':
        return {
          to: '',
          cc: '',
          subject: email.subject?.startsWith('FWD:') ? email.subject : `FWD: ${email.subject || ''}`
        };

      default:
        return { to: '', cc: '', subject: '' };
    }
  }, [email, action, userEmail]);

  // Helper: append quoted block to editor if not present
  const ensureQuotedInEditor = () => {
    if (!editorRef.current) return;
    const currentContent = editorRef.current.innerHTML;
    if (!currentContent.includes('--- Original Message ---')) {
      const quotedHtml = quoted.replace(/\n/g, '<br>');
      const newContent = currentContent ? `${currentContent}<br><br>${quotedHtml}` : quotedHtml;
      editorRef.current.innerHTML = newContent;
      setReplyHtml(newContent);
    }
  };

  // Attachment handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files]);
    }
    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (fileToRemove: File) => {
    setAttachments(prev => prev.filter(file => file !== fileToRemove));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && email) {
      setReplyHtml('');
      setShowOriginal(true);
      setToRecipients(buildInitialFields.to);
      setCcRecipients(buildInitialFields.cc);
      setSubject(buildInitialFields.subject);
      setIsPlainText(false);
      setAttachments([]);
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  }, [isOpen, email, buildInitialFields]);

  const handleGenerateAI = async () => {
    if (!email) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/v2/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Generate a ${action} draft in professional property management tone.`,
          context: {
            email: {
              id: email?.id,
              outlookId: email?.outlook_id,
              subject: email?.subject,
              from: email?.from_email || email?.from_name,
              bodyText: email?.body_preview || email?.body_full
            },
            tone: 'professional',
            mode: 'draft'
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI reply');
      }

      const data = await response.json();
      const aiText = data.answer || '';

      if (editorRef.current) {
        const currentContent = editorRef.current.innerHTML;
        const newContent = currentContent ? `${currentContent}<br><br>${aiText}` : aiText;
        editorRef.current.innerHTML = newContent;
        setReplyHtml(newContent);
      }
    } catch (error) {
      console.error('Error generating AI reply:', error);
      toast.error('Failed to generate AI reply');
    } finally {
      setIsGenerating(false);
    }
  };

  async function handleAiDraft() {
    try {
      if (aiLoading) return;
      setAiLoading(true);

      // Pull context from props (adjust names to this file's props)
      const subject  = email?.subject ?? '';
      const from     = email?.from_name || email?.from || email?.from_email || '';
      const bodyHtml = email?.body_html || email?.bodyFull || email?.body_full || '';
      const bodyText = email?.body_text || email?.bodyText || toPlain(bodyHtml);
      const to       = email?.to || email?.to_recipients || [];
      const cc       = email?.cc || email?.cc_recipients || [];

      // Pick task by mode
      let task = 'Draft a polite, concise reply as a UK property manager. Keep under 150 words.';
      if (action === 'reply-all') {
        task = 'Draft a polite, concise REPLY ALL as a UK property manager. Keep under 150 words.';
      } else if (action === 'forward') {
        task = 'Draft a brief, professional forward cover note summarising the issue and action required. Keep under 120 words.';
      }

      const { status, answer } = await askBlocIQ({
        question: task,
        context: {
          email: {
            id: email?.id,
            outlookId: email?.outlook_id,
            subject,
            from,
            bodyText
          },
          recipients: { to, cc },
          mode: action
        }
      });

      if (status !== 'ok' || !answer) {
        toast.error('AI couldn\'t generate a draft. Please try again.');
        return;
      }

      setEditorValue(answer);
      toast.success('Draft inserted');
    } catch (e:any) {
      toast.error(e?.message || 'AI draft failed');
    } finally {
      setAiLoading(false);
    }
  }

  const handleSend = async () => {
    if (!replyHtml.trim()) return;

    setIsSending(true);
    try {
      // Convert attachments to Graph format
      const graphAttachments = await Promise.all(
        attachments.map(async (file) => ({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: file.name,
          contentType: file.type || 'application/octet-stream',
          contentBytes: Buffer.from(await file.arrayBuffer()).toString('base64')
        }))
      );

      const emailData = {
        to: toRecipients,
        cc: ccRecipients,
        subject: subject,
        body: isPlainText ? replyHtml.replace(/<[^>]*>/g, '') : replyHtml,
        attachments: graphAttachments.length > 0 ? graphAttachments : undefined
      };

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send email');
      }

      toast.success('Email sent successfully');
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      handleAiDraft();
    }
  };

  const handleEditorChange = () => {
    if (editorRef.current) {
      setReplyHtml(editorRef.current.innerHTML);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/10 backdrop-blur-md">
      <div 
        className="fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[840px] rounded-2xl bg-white shadow-xl max-h-[85vh] flex flex-col z-[101]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {action === 'reply' && 'Reply'}
              {action === 'reply-all' && 'Reply All'}
              {action === 'forward' && 'Forward'}
            </h2>
            {email && (
              <div className="text-sm text-gray-500">
                Original: {email.from_name || email.from_email}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Action Bar - Fixed */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsPlainText(!isPlainText)}
                className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded"
              >
                {isPlainText ? 'Rich Text' : 'Plain Text'}
              </button>
              <button
                onClick={handleAiDraft}
                disabled={aiLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-4 w-4" />
                <span>{aiLoading ? 'Thinking…' : 'AI Draft'}</span>
              </button>
              <div className="text-xs text-gray-500">
                Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to send
              </div>
            </div>
          </div>

          {/* Email Fields - Fixed */}
          <div className="p-4 border-b border-gray-200 space-y-3 flex-shrink-0">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To:</label>
              <input
                ref={toInputRef}
                type="text"
                value={toRecipients}
                onChange={(e) => setToRecipients(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter recipients..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cc:</label>
              <input
                type="text"
                value={ccRecipients}
                onChange={(e) => setCcRecipients(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter CC recipients..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter subject..."
              />
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachments:</label>
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                      <div className="flex items-center space-x-2">
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {file.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAttachment(file)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Remove attachment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Rich Text Toolbar - Fixed */}
          {!isPlainText && (
            <div className="flex-shrink-0">
              <RichTextToolbar editorRef={editorRef} />
            </div>
          )}

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto max-h-[70vh] overscroll-contain p-4 space-y-4">
            {/* Original Email Display - Always Visible */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Original Email</label>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-48 overflow-y-auto">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">From:</span> {email?.from_name || email?.from_email || 'Unknown sender'}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Date:</span> {email?.received_at ? new Date(email.received_at).toLocaleString() : 'Unknown date'}
                  </div>
                  {email?.building_id && (
                    <div>
                      <span className="font-medium text-gray-700">Building ID:</span> {email.building_id}
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-sm text-gray-600 whitespace-pre-wrap">
                    {email?.body_content_type === 'html' 
                      ? email?.body?.replace(/<[^>]*>/g, '') || email?.body_preview || 'No content available'
                      : email?.body || email?.body_preview || 'No content available'
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Editor */}
            {isPlainText ? (
              <textarea
                className="w-full p-6 border-0 resize-none focus:outline-none focus:ring-0 text-gray-900 leading-relaxed overflow-y-auto"
                value={replyHtml.replace(/<[^>]*>/g, '')}
                onChange={(e) => setReplyHtml(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
                style={{ minHeight: '300px', maxHeight: '400px' }}
              />
            ) : (
              <div
                ref={editorRef}
                contentEditable
                className="w-full p-6 border-0 resize-none focus:outline-none focus:ring-0 text-gray-900 leading-relaxed min-h-[200px]"
                onInput={handleEditorChange}
                onKeyDown={handleKeyDown}
                suppressContentEditableWarning
              />
            )}

            {/* Original message panel */}
            <div className="mt-4 mx-6 mb-4 rounded-lg border bg-gray-50">
              <div className="flex items-center justify-between px-4 py-2">
                <button
                  type="button"
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  onClick={() => setShowOriginal(s => !s)}
                >
                  {showOriginal ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span>Original Message</span>
                </button>

                <button
                  type="button"
                  className="text-xs text-indigo-600 hover:underline"
                  onClick={ensureQuotedInEditor}
                >
                  Insert quoted original into editor
                </button>
              </div>

              {showOriginal && (
                <div className="max-h-[40vh] overflow-y-auto bg-white border-t px-4 py-3">
                  {cleanedHtml ? (
                    <div className="prose max-w-none">
                      <div 
                        dangerouslySetInnerHTML={{ __html: cleanedHtml }}
                        className="text-gray-800 leading-relaxed text-sm"
                      />
                    </div>
                  ) : email?.body_full ? (
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                      {email.body_full}
                    </pre>
                  ) : email?.body_preview ? (
                    <div className="text-gray-800 leading-relaxed text-sm">
                      {email.body_preview}
                    </div>
                  ) : (
                    <div className="text-gray-500 italic text-sm">No content available</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 flex-shrink-0">
          <div className="text-sm text-gray-500">
            {replyHtml.trim() ? 'Ready to send' : 'Enter a message to send'}
            {attachments.length > 0 && ` • ${attachments.length} attachment${attachments.length !== 1 ? 's' : ''}`}
          </div>
          <div className="flex items-center space-x-3">
            <BiqSecondary onClick={onClose}>
              Cancel
            </BiqSecondary>
            <BiqPrimary onClick={handleSend} disabled={!replyHtml.trim() || isSending}>
              <SendHorizonal className="h-4 w-4" />
              <span>{isSending ? 'Sending...' : 'Send'}</span>
            </BiqPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}
