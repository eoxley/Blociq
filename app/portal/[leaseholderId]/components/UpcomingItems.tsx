'use client';

import { useEffect, useState } from 'react';
import { CalendarDaysIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface UpcomingItem {
  id: string;
  type: 'maintenance' | 'payment' | 'inspection' | 'meeting';
  title: string;
  date: string;
  priority: 'high' | 'medium' | 'low';
  description?: string;
}

interface UpcomingItemsProps {
  leaseholderId: string;
}

export function UpcomingItems({ leaseholderId }: UpcomingItemsProps) {
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingItems = async () => {
      try {
        const response = await fetch(`/api/portal/${leaseholderId}/upcoming`);
        if (response.ok) {
          const data = await response.json();
          setItems(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch upcoming items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingItems();
  }, [leaseholderId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Tomorrow';
    if (diffInDays < 7) return `In ${diffInDays} days`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'maintenance':
        return '🔧';
      case 'payment':
        return '💰';
      case 'inspection':
        return '📋';
      case 'meeting':
        return '👥';
      default:
        return '📅';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Items</h3>
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
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Items</h3>
        <a
          href={`/portal/${leaseholderId}/building`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          View calendar
        </a>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6">
          <CalendarDaysIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No upcoming items</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.slice(0, 4).map((item) => (
            <div key={item.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
              <div className="flex-shrink-0 text-lg">
                {getTypeIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.title}
                  </p>
                  <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(item.date)}
                </p>
                {item.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                    {item.description}
                  </p>
                )}
              </div>
              {item.priority === 'high' && (
                <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}