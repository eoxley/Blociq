'use client';

import { useState, useEffect } from 'react';
import { X, Send, Paperclip, Sparkles, Eye, EyeOff } from 'lucide-react';
import { toPlainQuoted, sanitizeEmailHtml } from '@/utils/emailFormatting';

interface ReplyModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  email: any;
  action: 'reply' | 'reply-all' | 'forward';
}

export default function ReplyModalV2({ isOpen, onClose, email, action }: ReplyModalV2Props) {
  const [replyBody, setReplyBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hasQuotedBlock, setHasQuotedBlock] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && email) {
      setReplyBody('');
      setHasQuotedBlock(false);
      setShowPreview(false);
    }
  }, [isOpen, email]);

  // Ensure quoted block is present when email is loaded
  useEffect(() => {
    if (email && !hasQuotedBlock && replyBody.trim()) {
      const quotedBlock = toPlainQuoted(email);
      if (!replyBody.includes('--- Original Message ---')) {
        setReplyBody(prev => `${prev}\n\n${quotedBlock}`);
        setHasQuotedBlock(true);
      }
    }
  }, [email, hasQuotedBlock, replyBody]);

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
        const quotedBlock = toPlainQuoted(email);
        setReplyBody(`${aiText}\n\n${quotedBlock}`);
        setHasQuotedBlock(true);
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
    if (!replyBody.trim()) {
      alert('Please enter a message');
      return;
    }

    console.log('Sending email:', {
      action,
      emailId: email?.id,
      body: replyBody,
      to: action === 'reply' || action === 'reply-all' ? email?.from_email : '',
      cc: action === 'reply-all' ? email?.cc : '',
      subject: action === 'forward' ? `Fwd: ${email?.subject}` : `Re: ${email?.subject}`
    });

    // TODO: Wire up actual email sending
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
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
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Reply Form */}
          <div className="flex-1 flex flex-col">
            {/* Action Bar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <Paperclip className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center space-x-3">
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

            {/* Reply Textarea */}
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 p-6 border-0 resize-none focus:outline-none focus:ring-0 text-gray-900 leading-relaxed"
              placeholder="Type your message here..."
            />
          </div>

          {/* Right Panel - Email Preview */}
          {showPreview && email && (
            <div className="w-96 border-l border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">Original Email</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="prose max-w-full">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: sanitizeEmailHtml(email.body_html || '') 
                    }}
                    className="text-gray-800 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {replyBody.trim() ? 'Ready to send' : 'Enter a message to send'}
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
              disabled={!replyBody.trim()}
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
