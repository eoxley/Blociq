'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Send, Paperclip, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { toPlainQuoted, sanitizeEmailHtml, looksLikeHtml } from '@/utils/emailFormatting';
import RichTextToolbar from './RichTextToolbar';

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
  const [showOriginal, setShowOriginal] = useState(true); // default expanded
  const [toRecipients, setToRecipients] = useState('');
  const [ccRecipients, setCcRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [isPlainText, setIsPlainText] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);

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
        if (typeof item === 'object' && item.email) {
          return { name: item.name, email: item.email };
        }
        return null;
      }).filter(Boolean) as Address[];
    }
    
    if (typeof raw === 'string') {
      return raw.split(',').map(email => ({ email: email.trim() }));
    }
    
    return [];
  };

  const uniqueByEmail = (list: Address[]): Address[] => {
    const seen = new Set<string>();
    return list.filter(item => {
      if (seen.has(item.email.toLowerCase())) {
        return false;
      }
      seen.add(item.email.toLowerCase());
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

    const normalizedTo = normalizeRecipients(email.to_recipients || email.to);
    const normalizedCc = normalizeRecipients(email.cc_recipients || email.cc);
    const fromEmail = email.from_email ? [{ email: email.from_email }] : [];

    let toAddresses: Address[] = [];
    let ccAddresses: Address[] = [];
    let subjectText = '';

    switch (action) {
      case 'reply':
        toAddresses = fromEmail;
        ccAddresses = [];
        subjectText = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`;
        break;
      
      case 'reply-all':
        const rawTo = [...normalizedTo, ...fromEmail];
        const rawCc = normalizedCc;
        toAddresses = uniqueByEmail(excludeSelf(rawTo, userEmail || null));
        ccAddresses = uniqueByEmail(excludeSelf(rawCc, userEmail || null));
        subjectText = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject || ''}`;
        break;
      
      case 'forward':
        toAddresses = [];
        ccAddresses = [];
        subjectText = email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject || ''}`;
        break;
    }

    return {
      to: toAddresses.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email).join(', '),
      cc: ccAddresses.map(addr => addr.name ? `${addr.name} <${addr.email}>` : addr.email).join(', '),
      subject: subjectText
    };
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

  // Rich text editor handlers
  const handleBold = () => {
    document.execCommand('bold', false);
    if (editorRef.current) {
      setReplyHtml(editorRef.current.innerHTML);
    }
  };

  const handleItalic = () => {
    document.execCommand('italic', false);
    if (editorRef.current) {
      setReplyHtml(editorRef.current.innerHTML);
    }
  };

  const handleUnderline = () => {
    document.execCommand('underline', false);
    if (editorRef.current) {
      setReplyHtml(editorRef.current.innerHTML);
    }
  };

  const handleFontChange = (font: string) => {
    document.execCommand('fontName', false, font);
    if (editorRef.current) {
      setReplyHtml(editorRef.current.innerHTML);
    }
  };

  const handleSizeChange = (size: string) => {
    document.execCommand('fontSize', false, size);
    if (editorRef.current) {
      setReplyHtml(editorRef.current.innerHTML);
    }
  };

  const handleList = () => {
    document.execCommand('insertUnorderedList', false);
    if (editorRef.current) {
      setReplyHtml(editorRef.current.innerHTML);
    }
  };

  const handleLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      document.execCommand('createLink', false, url);
      if (editorRef.current) {
        setReplyHtml(editorRef.current.innerHTML);
      }
    }
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
    }
  }, [isOpen, email, buildInitialFields]);

  const handleGenerateAI = async () => {
    if (!email) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ask-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context_type: 'email_reply',
          action,
          emailId: email.id,
          source: 'inbox-v2'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to generate AI reply`);
      }

      const result = await response.json();
      
      if (result.success && result.text) {
        const aiText = result.text.trim();
        const aiHtml = aiText.replace(/\n/g, '<br>');
        const quotedHtml = quoted.replace(/\n/g, '<br>');
        const newContent = `${aiHtml}<br><br>${quotedHtml}`;
        
        if (editorRef.current) {
          editorRef.current.innerHTML = newContent;
        }
        setReplyHtml(newContent);
      } else {
        throw new Error(result.error || 'Failed to generate AI reply');
      }
    } catch (error) {
      console.error('Error generating AI reply:', error);
      alert('Failed to generate AI reply. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = () => {
    if (!replyHtml.trim()) {
      alert('Please enter a message');
      return;
    }

    // Sanitize the HTML before sending
    const sanitizedHtml = sanitizeEmailHtml(replyHtml);

    console.log('Sending email:', {
      action,
      emailId: email?.id,
      to: toRecipients,
      cc: ccRecipients,
      subject,
      body: sanitizedHtml
    });

    // TODO: Wire up actual email sending
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSend();
    }
  };

  const handleEditorChange = () => {
    if (editorRef.current) {
      setReplyHtml(editorRef.current.innerHTML);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Action Bar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
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
                disabled={isGenerating}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isGenerating ? 'Generating...' : 'Generate AI Reply'}</span>
              </button>
              <div className="text-xs text-gray-500">
                Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to send
              </div>
            </div>
          </div>

          {/* Email Fields */}
          <div className="p-4 border-b border-gray-200 space-y-3">
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
          </div>

          {/* Rich Text Toolbar */}
          {!isPlainText && (
            <RichTextToolbar
              onBold={handleBold}
              onItalic={handleItalic}
              onUnderline={handleUnderline}
              onFontChange={handleFontChange}
              onSizeChange={handleSizeChange}
              onList={handleList}
              onLink={handleLink}
            />
          )}

          {/* Editor */}
          {isPlainText ? (
            <textarea
              className="flex-1 p-6 border-0 resize-none focus:outline-none focus:ring-0 text-gray-900 leading-relaxed"
              value={replyHtml.replace(/<[^>]*>/g, '')}
              onChange={(e) => setReplyHtml(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here..."
            />
          ) : (
            <div
              ref={editorRef}
              contentEditable
              className="flex-1 p-6 border-0 resize-none focus:outline-none focus:ring-0 text-gray-900 leading-relaxed overflow-y-auto"
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

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {replyHtml.trim() ? 'Ready to send' : 'Enter a message to send'}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!replyHtml.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
