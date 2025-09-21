'use client';

import { useEffect, useState } from 'react';
import {
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface CommunicationsHistoryProps {
  leaseholderId: string;
}

interface Communication {
  id: string;
  type: string;
  subject: string;
  content?: string;
  direction: 'incoming' | 'outgoing';
  created_at: string;
}

export function CommunicationsHistory({ leaseholderId }: CommunicationsHistoryProps) {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunications = async () => {
      try {
        const response = await fetch(`/api/portal/${leaseholderId}/communications?limit=10`);
        if (response.ok) {
          const data = await response.json();
          setCommunications(data.communications || []);
        }
      } catch (error) {
        console.error('Failed to fetch communications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCommunications();
  }, [leaseholderId]);

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'email':
        return EnvelopeIcon;
      case 'phone':
      case 'call':
        return PhoneIcon;
      default:
        return ChatBubbleLeftRightIcon;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Communications History</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Communications History</h3>
        <button className="text-sm text-blue-600 hover:text-blue-800">
          View all
        </button>
      </div>

      {communications.length === 0 ? (
        <div className="text-center py-8">
          <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No communications yet</p>
          <p className="text-gray-400 text-xs mt-1">
            All communications about your property will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {communications.map((comm) => {
            const TypeIcon = getTypeIcon(comm.type);
            return (
              <div key={comm.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0">
                  <div className={`p-2 rounded-full ${
                    comm.direction === 'incoming' ? 'bg-blue-50' : 'bg-green-50'
                  }`}>
                    <TypeIcon className={`w-4 h-4 ${
                      comm.direction === 'incoming' ? 'text-blue-600' : 'text-green-600'
                    }`} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {comm.subject}
                    </p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      comm.direction === 'incoming'
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-green-600 bg-green-50'
                    }`}>
                      {comm.direction === 'incoming' ? 'Received' : 'Sent'}
                    </span>
                  </div>

                  {comm.content && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {comm.content.substring(0, 120)}
                      {comm.content.length > 120 ? '...' : ''}
                    </p>
                  )}

                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <ClockIcon className="w-3 h-3" />
                    <span>{formatDate(comm.created_at)}</span>
                    <span>•</span>
                    <span className="capitalize">{comm.type}</span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <button className="text-xs text-blue-600 hover:text-blue-800">
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex space-x-3">
          <button className="flex-1 px-3 py-2 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors">
            Send Message
          </button>
          <button className="flex-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Download History
          </button>
        </div>
      </div>
    </div>
  );
}