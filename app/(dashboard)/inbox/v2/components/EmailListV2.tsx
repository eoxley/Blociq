'use client';

import { Mail, Star, Trash2, Flag } from 'lucide-react';

interface Email {
  id: string;
  from_name?: string | null;
  from_email?: string | null;
  subject?: string | null;
  body_preview?: string | null;
  received_at?: string | null;
  unread?: boolean | null;
  is_read?: boolean | null;
  flag_status?: string | null;
  importance?: string | null;
  has_attachments?: boolean | null;
}

interface EmailListV2Props {
  emails: Email[];
  selectedEmailId?: string | null;
  onSelect: (emailId: string) => void;
  onToggleFlag: (emailId: string) => void;
  onDelete: (emailId: string) => void;
  loading?: boolean;
}

export default function EmailListV2({ 
  emails, 
  selectedEmailId, 
  onSelect, 
  onToggleFlag, 
  onDelete, 
  loading = false 
}: EmailListV2Props) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleDragStart = (e: React.DragEvent, emailId: string) => {
    e.dataTransfer.setData('emailId', emailId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const isUnread = (email: Email) => email.unread || !email.is_read;

  if (loading) {
    return (
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="text-sm font-medium text-gray-900">
          {emails.length} email{emails.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <Mail className="h-8 w-8 mr-2" />
            No emails found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {emails.map((email) => {
              const isSelected = selectedEmailId === email.id;
              const unread = isUnread(email);
              
              return (
                <div
                  key={email.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, email.id)}
                  onClick={() => onSelect(email.id)}
                  className={`p-4 cursor-pointer transition-colors group relative ${
                    isSelected
                      ? 'bg-blue-50 border-r-2 border-blue-500'
                      : 'hover:bg-gray-50'
                  } ${unread ? 'bg-blue-50' : ''}`}
                >
                  {/* Hover Actions */}
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFlag(email.id);
                      }}
                      className="p-1 text-gray-400 hover:text-yellow-500 rounded"
                      title={email.flag_status ? 'Remove flag' : 'Add flag'}
                    >
                      <Flag className={`h-3 w-3 ${email.flag_status ? 'text-yellow-500 fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(email.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {unread && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                      )}
                      <span className="font-medium text-gray-900 truncate">
                        {email.from_name || email.from_email}
                      </span>
                      {email.flag_status && (
                        <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {email.received_at ? formatDate(email.received_at) : ''}
                    </span>
                  </div>
                  
                  <div className={`mb-1 truncate ${unread ? 'font-semibold' : 'font-medium'} text-gray-900`}>
                    {email.subject || 'No Subject'}
                  </div>
                  
                  <div className="text-sm text-gray-600 line-clamp-2">
                    {email.body_preview || 'No preview available'}
                  </div>
                  
                  {email.has_attachments && (
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <span className="mr-1">📎</span>
                      <span>Has attachments</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
