'use client';

import { Mail, Calendar, User, Paperclip, Reply, ReplyAll, Forward, Star, Flag } from 'lucide-react';
import { sanitizeEmailHtml, looksLikeHtml } from '@/utils/emailFormatting';

interface EmailDetailV2Props {
  email: any;
  onReply: (action: 'reply' | 'reply-all' | 'forward') => void;
  onToggleFlag: (emailId: string) => void;
  onDelete: (emailId: string) => void;
}

export default function EmailDetailV2({ email, onReply, onToggleFlag, onDelete }: EmailDetailV2Props) {
  // Determine the best body content to display
  const rawHtml = email?.body_html ?? (email?.body_full && looksLikeHtml(email.body_full) ? email.body_full : null);
  const cleanedHtml = rawHtml ? sanitizeEmailHtml(rawHtml) : null;

  if (!email) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No email selected</h3>
          <p className="text-gray-500">Select an email from the list to view its details</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const hasAttachments = email.attachments && email.attachments.length > 0;

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Action Bar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onReply('reply')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            title="Reply (R)"
          >
            <Reply className="h-4 w-4" />
            <span>Reply</span>
          </button>
          <button
            onClick={() => onReply('reply-all')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            title="Reply All (A)"
          >
            <ReplyAll className="h-4 w-4" />
            <span>Reply All</span>
          </button>
          <button
            onClick={() => onReply('forward')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            title="Forward (F)"
          >
            <Forward className="h-4 w-4" />
            <span>Forward</span>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggleFlag(email.id)}
            className={`p-2 rounded-lg transition-colors ${
              email.flag_status 
                ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' 
                : 'text-gray-400 hover:text-yellow-600 hover:bg-yellow-50'
            }`}
            title={email.flag_status ? 'Remove flag' : 'Add flag'}
          >
            <Flag className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(email.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete (Del)"
          >
            <Mail className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Email Header */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {email.subject || 'No Subject'}
          </h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              <span>{email.from_name || email.from_email}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{formatDate(email.received_at)}</span>
            </div>
            {hasAttachments && (
              <div className="flex items-center">
                <Paperclip className="h-4 w-4 mr-1" />
                <span>{email.attachments.length} attachment(s)</span>
              </div>
            )}
          </div>
        </div>

        {/* To/Cc/Bcc */}
        <div className="space-y-2 text-sm">
          {email.to && (
            <div className="flex">
              <span className="font-medium text-gray-700 w-12">To:</span>
              <span className="text-gray-600">{email.to}</span>
            </div>
          )}
          {email.cc && (
            <div className="flex">
              <span className="font-medium text-gray-700 w-12">Cc:</span>
              <span className="text-gray-600">{email.cc}</span>
            </div>
          )}
          {email.bcc && (
            <div className="flex">
              <span className="font-medium text-gray-700 w-12">Bcc:</span>
              <span className="text-gray-600">{email.bcc}</span>
            </div>
          )}
        </div>
      </div>

      {/* Email Content - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 pr-4">
        <div className="p-6">
          {cleanedHtml ? (
            <div className="prose max-w-none">
              <div 
                dangerouslySetInnerHTML={{ __html: cleanedHtml }}
                className="text-gray-800 leading-relaxed text-sm"
              />
            </div>
          ) : email.body_full ? (
            <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
              {email.body_full}
            </pre>
          ) : email.body_preview ? (
            <div className="text-gray-800 leading-relaxed text-sm">
              {email.body_preview}
            </div>
          ) : (
            <div className="text-gray-500 italic text-sm">No content available</div>
          )}

          {/* Attachments */}
          {hasAttachments && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Attachments</h4>
              <div className="space-y-2">
                {email.attachments.map((attachment: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <Paperclip className="h-4 w-4 text-gray-500 mr-3" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {attachment.type?.startsWith('image/') || attachment.type === 'application/pdf' ? (
                        <button 
                          onClick={() => window.open(attachment.url, '_blank')}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Preview
                        </button>
                      ) : null}
                      <button 
                        onClick={() => window.open(attachment.url, '_blank')}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
