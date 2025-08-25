'use client';

import React from 'react';
import { Mail, Clock, Flag, Building2, User, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Email {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_email: string;
  body_preview: string | null;
  received_at: string;
  unread: boolean;
  handled: boolean;
  building_id: string | null;
  building_name?: string;
  tags?: string[];
}

interface EmailListPanelProps {
  emails: Email[];
  selectedEmailId: string | null;
  onEmailSelect: (email: Email) => void;
  onMarkAsRead: (emailId: string) => void;
  onMarkAsHandled: (emailId: string) => void;
  onFlagEmail: (emailId: string) => void;
}

export default function EmailListPanel({
  emails,
  selectedEmailId,
  onEmailSelect,
  onMarkAsRead,
  onMarkAsHandled,
  onFlagEmail
}: EmailListPanelProps) {
  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const truncateText = (text: string, maxLength: number = 60) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Mail className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No emails found</p>
        <p className="text-sm">Your inbox is empty</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {emails.map((email) => (
        <div
          key={email.id}
          className={`border-b border-gray-100 cursor-pointer transition-all hover:bg-gray-50 ${
            selectedEmailId === email.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
          } ${email.unread ? 'bg-white' : 'bg-gray-50'}`}
          onClick={() => onEmailSelect(email)}
        >
          <div className="p-4">
            {/* Header Row */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {email.unread ? (
                  <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
                
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-medium text-gray-900 truncate">
                    {email.from_name || email.from_email}
                  </span>
                  {email.building_name && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      <Building2 className="h-3 w-3" />
                      {email.building_name}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(email.received_at)}
                </span>
                {email.handled && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Handled"></div>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="mb-2">
              <h3 className={`font-medium ${email.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                {email.subject || 'No Subject'}
              </h3>
            </div>

            {/* Preview */}
            {email.body_preview && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {truncateText(email.body_preview, 80)}
                </p>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {email.tags && email.tags.length > 0 && (
                  <div className="flex gap-1">
                    {email.tags.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {email.tags.length > 2 && (
                      <span className="text-xs text-gray-500">
                        +{email.tags.length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1">
                {!email.unread && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(email.id);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Mark as unread"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                
                {email.unread && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(email.id);
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Mark as read"
                  >
                    <EyeOff className="h-4 w-4" />
                  </button>
                )}

                {!email.handled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsHandled(email.id);
                    }}
                    className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                    title="Mark as handled"
                  >
                    <div className="w-4 h-4 border-2 border-current rounded-full"></div>
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFlagEmail(email.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Flag email"
                >
                  <Flag className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
