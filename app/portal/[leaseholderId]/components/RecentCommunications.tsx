'use client';

import { useEffect, useState } from 'react';
import { ChatBubbleLeftRightIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

interface Communication {
  id: string;
  type: string;
  subject: string;
  created_at: string;
  direction: 'incoming' | 'outgoing';
  content?: string;
}

interface RecentCommunicationsProps {
  leaseholderId: string;
}

export function RecentCommunications({ leaseholderId }: RecentCommunicationsProps) {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCommunications = async () => {
      try {
        const response = await fetch(`/api/portal/${leaseholderId}/communications?limit=5`);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Communications</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Communications</h3>
        <a
          href={`/portal/${leaseholderId}/account`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View all
        </a>
      </div>

      {communications.length === 0 ? (
        <div className="text-center py-6">
          <ChatBubbleLeftRightIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No recent communications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {communications.map((comm) => (
            <div key={comm.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
              <div className="flex-shrink-0">
                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {comm.subject}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {comm.direction === 'incoming' ? 'Received' : 'Sent'} • {formatDate(comm.created_at)}
                </p>
                {comm.content && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {comm.content.substring(0, 100)}...
                  </p>
                )}
              </div>
              <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                comm.direction === 'incoming' ? 'bg-blue-400' : 'bg-green-400'
              }`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}