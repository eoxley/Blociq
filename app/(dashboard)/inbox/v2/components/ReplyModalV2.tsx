'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Send, Paperclip, Sparkles, ChevronDown, ChevronRight, Trash2, SendHorizonal } from 'lucide-react';
import { toPlainQuoted, sanitizeEmailHtml, looksLikeHtml } from '@/utils/emailFormatting';
import RichTextToolbar from './RichTextToolbar';
import { BiqPrimary, BiqSecondary } from '@/components/ui/biq-button';
import { toast } from 'sonner';

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
  const [showOriginal, setShowOriginal] = useState(true);
  const [toRecipients, setToRecipients] = useState('');
  const [ccRecipients, setCcRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [isPlainText, setIsPlainText] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ensure the quoted block can be inserted once
  const quoted = useMemo(() => toPlainQuoted(email), [email]);

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
      // Call the unified brain with draft mode
      const response = await fetch('/api/ask-blociq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Generate the reply in the property manager tone.",
          mode: "draft",
          action: action,
          email_id: email.id,
          building_id: email.building_id,
          include_thread: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate AI reply');
      }

      const data = await response.json();
      
      // Update recipients and subject if provided
      if (data.recipients) {
        setToRecipients(data.recipients.to.join(', '));
        setCcRecipients(data.recipients.cc.join(', '));
        setSubject(data.recipients.subject);
      }

      // Update the editor with the AI-generated content
      if (editorRef.current) {
        const currentContent = editorRef.current.innerHTML;
        const newContent = currentContent ? `${currentContent}<br><br>${data.answer}` : data.answer;
        editorRef.current.innerHTML = newContent;
        setReplyHtml(newContent);
      }

      // Show success message with citations if available
      if (data.citations && data.citations.length > 0) {
        toast.success(`AI draft generated with ${data.citations.length} citations`);
      } else {
        toast.success('AI draft generated');
      }
    } catch (error) {
      console.error('Error generating AI reply:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate AI reply');
    } finally {
      setIsGenerating(false);
    }
  };

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

  const handleCreateAIDraft = async () => {
    if (!email) return;
    
    setIsGenerating(true);
    try {
      // Call the unified brain with draft mode
      const response = await fetch('/api/ask-blociq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Generate the reply in the property manager tone.",
          mode: "draft",
          action: action,
          email_id: email.id,
          building_id: email.building_id,
          include_thread: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate AI draft');
      }

      const data = await response.json();
      
      // Save to Outlook Drafts using the tools endpoint
      const draftResponse = await fetch('/api/tools/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: data.recipients?.to || [],
          cc: data.recipients?.cc || [],
          subject: data.recipients?.subject || data.subject,
          html_body: data.answer,
          save_to_drafts: true,
          reply_to_id: email.id
        }),
      });

      if (!draftResponse.ok) {
        const draftError = await draftResponse.json();
        throw new Error(draftError.error || 'Failed to save draft');
      }

      // Show success message with citations if available
      if (data.citations && data.citations.length > 0) {
        toast.success(`AI draft saved to Outlook Drafts with ${data.citations.length} citations`);
      } else {
        toast.success('AI draft saved to Outlook Drafts');
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating AI draft:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create AI draft');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  // Check if AI is enabled
  const isAIEnabled = process.env.NEXT_PUBLIC_AI_ENABLED === 'true';

  const handleEditorChange = () => {
    if (editorRef.current) {
      setReplyHtml(editorRef.current.innerHTML);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
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
                onClick={handleGenerateAI}
                disabled={isGenerating || !isAIEnabled}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isAIEnabled ? 'AI currently disabled' : undefined}
              >
                <Sparkles className="h-4 w-4" />
                <span>{isGenerating ? 'Generating...' : 'Generate AI Reply'}</span>
              </button>
              <button
                onClick={handleCreateAIDraft}
                disabled={isGenerating || !isAIEnabled}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={!isAIEnabled ? 'AI currently disabled' : 'Create AI draft and save to Outlook Drafts'}
              >
                <Sparkles className="h-4 w-4" />
                <span>{isGenerating ? 'Creating...' : 'Create AI Draft'}</span>
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
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 pr-2">
            {/* Editor */}
            {isPlainText ? (
              <textarea
                className="w-full p-6 border-0 resize-none focus:outline-none focus:ring-0 text-gray-900 leading-relaxed min-h-[200px]"
                value={replyHtml.replace(/<[^>]*>/g, '')}
                onChange={(e) => setReplyHtml(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here..."
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
