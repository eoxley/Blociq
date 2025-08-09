'use client';

import { useState, useEffect, useRef } from 'react';
import { Mail, Calendar, User, Paperclip } from 'lucide-react';
import { sanitizeEmailHtml, looksLikeHtml } from '@/utils/emailFormatting';

interface EmailDetailV2Props {
  email: any;
  onReply: (action: 'reply' | 'reply-all' | 'forward') => void;
  onDelete: (emailId: string) => void;
}

export default function EmailDetailV2({ email, onReply, onDelete }: EmailDetailV2Props) {
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
      {/* Email Header */}
      <div className="p-6 border-b border-gray-200">
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

      {/* Email Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {cleanedHtml ? (
          <div className="prose max-w-none">
            <div 
              dangerouslySetInnerHTML={{ __html: cleanedHtml }}
              className="text-gray-800 leading-relaxed"
            />
          </div>
        ) : email.body_full ? (
          <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
            {email.body_full}
          </pre>
        ) : email.body_preview ? (
          <div className="text-gray-800 leading-relaxed">
            {email.body_preview}
          </div>
        ) : (
          <div className="text-gray-500 italic">No content available</div>
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
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
