'use client';

import { useState } from 'react';
import { Flag, Trash2, Download, Eye, Reply, ReplyAll, Forward } from 'lucide-react';
import { sanitizeEmailHtml, looksLikeHtml } from '@/utils/emailFormatting';
import { BiqPrimary, BiqSecondary } from '@/components/ui/biq-button';

interface EmailDetailV2Props {
  email: any;
  onReply: (action: 'reply' | 'reply-all' | 'forward') => void;
  onToggleFlag: (emailId: string) => void;
  onDelete: (emailId: string) => void;
}

function ActionBar({ onReply }: { onReply: (a: 'reply' | 'reply-all' | 'forward') => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <BiqPrimary onClick={() => onReply('reply')}>
        <Reply className="h-4 w-4" />
        <span className="font-medium">Reply</span>
      </BiqPrimary>
      <BiqSecondary onClick={() => onReply('reply-all')}>
        <ReplyAll className="h-4 w-4 text-gray-500" />
        <span className="font-medium">Reply All</span>
      </BiqSecondary>
      <BiqSecondary onClick={() => onReply('forward')}>
        <Forward className="h-4 w-4 text-gray-500" />
        <span className="font-medium">Forward</span>
      </BiqSecondary>
    </div>
  );
}

export default function EmailDetailV2({ email, onReply, onToggleFlag, onDelete }: EmailDetailV2Props) {
  if (!email) {
    return (
      <div className="flex flex-col h-full bg-white border-l border-gray-200">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-lg font-medium mb-2">No email selected</div>
            <div className="text-sm">Select an email from the list to view its details</div>
          </div>
        </div>
      </div>
    );
  }

  // Determine the best body content to display
  const rawHtml = email.body_html ?? (looksLikeHtml(email.body_full) ? email.body_full : null);
  const cleanedHtml = rawHtml ? sanitizeEmailHtml(rawHtml) : null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Action Bar - Fixed */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <ActionBar onReply={onReply} />
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggleFlag(email.id)}
            className={`p-2 rounded-lg transition-colors ${
              email.flag_status === 'flagged'
                ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                : 'text-gray-400 hover:text-yellow-600 hover:bg-gray-100'
            }`}
            title={email.flag_status === 'flagged' ? 'Remove flag' : 'Add flag'}
          >
            <Flag className={`h-4 w-4 ${email.flag_status === 'flagged' ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={() => onDelete(email.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete email"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Email Header - Fixed */}
      <div className="p-6 border-b border-gray-200 flex-shrink-0">
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">{email.subject || 'No Subject'}</h1>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>From: {email.from_name || email.from_email}</span>
              <span>{formatDate(email.received_at || email.created_at)}</span>
            </div>
          </div>

          {email.to_recipients && email.to_recipients.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">To:</div>
              <div className="text-sm text-gray-600">
                {Array.isArray(email.to_recipients) 
                  ? email.to_recipients.map((recipient: any, index: number) => (
                      <span key={index}>
                        {recipient.name || recipient.email || recipient}
                        {index < email.to_recipients.length - 1 ? ', ' : ''}
                      </span>
                    ))
                  : email.to_recipients
                }
              </div>
            </div>
          )}

          {email.cc_recipients && email.cc_recipients.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Cc:</div>
              <div className="text-sm text-gray-600">
                {Array.isArray(email.cc_recipients)
                  ? email.cc_recipients.map((recipient: any, index: number) => (
                      <span key={index}>
                        {recipient.name || recipient.email || recipient}
                        {index < email.cc_recipients.length - 1 ? ', ' : ''}
                      </span>
                    ))
                  : email.cc_recipients
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Content - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 pr-4">
        <div className="p-6">
          {/* Email Body */}
          <div className="mb-6">
            {cleanedHtml ? (
              <div 
                className="prose max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: cleanedHtml }}
              />
            ) : email.body_full ? (
              <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
                {email.body_full}
              </pre>
            ) : email.body_preview ? (
              <div className="text-sm text-gray-800 leading-relaxed">
                {email.body_preview}
              </div>
            ) : (
              <div className="text-gray-500 italic text-sm">No content available</div>
            )}
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Attachments ({email.attachments.length})</h3>
              <div className="space-y-2">
                {email.attachments.map((attachment: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded border">
                        <Download className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{attachment.name}</div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(attachment.size || 0)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Preview attachment"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Download attachment"
                      >
                        <Download className="h-4 w-4" />
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
