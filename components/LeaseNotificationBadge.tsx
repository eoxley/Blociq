'use client';

import React, { useState } from 'react';
import { Bell, FileText, AlertCircle, CheckCircle, Clock, X, Eye } from 'lucide-react';
import { useLeaseNotifications } from '@/contexts/LeaseNotificationContext';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const { notifications, markAsRead, markAllAsRead, clearNotification, getNotificationsByStatus } = useLeaseNotifications();
  
  if (!isOpen) return null;

  const completedNotifications = getNotificationsByStatus('completed');
  const failedNotifications = getNotificationsByStatus('failed');
  const processingNotifications = getNotificationsByStatus('processing');

  const handleViewResults = (jobId: string, notificationId: string) => {
    markAsRead(notificationId);
    // Navigate to results page
    window.location.href = `/lease-analysis/${jobId}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'border-l-green-500 bg-green-50';
      case 'failed':
        return 'border-l-red-500 bg-red-50';
      case 'processing':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Lease Analysis Updates</h3>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">No lease analysis updates</p>
            <p className="text-xs text-gray-400 mt-1">Your completed analyses will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-l-4 ${getStatusColor(notification.status)} ${
                  notification.isViewed ? 'opacity-70' : ''
                } hover:bg-opacity-75 transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(notification.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`text-sm font-medium text-gray-900 ${!notification.isViewed ? 'font-semibold' : ''}`}>
                          {notification.status === 'completed' && '✅ Analysis Complete'}
                          {notification.status === 'failed' && '❌ Analysis Failed'}
                          {notification.status === 'processing' && '🔄 Processing...'}
                        </p>
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {notification.filename}
                        </p>
                        
                        {notification.status === 'failed' && notification.errorMessage && (
                          <p className="text-xs text-red-600 mt-1">
                            {notification.errorMessage}
                          </p>
                        )}
                        
                        {notification.completedAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDistanceToNow(new Date(notification.completedAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        {!notification.isViewed && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                        <button
                          onClick={() => clearNotification(notification.id)}
                          className="p-1 hover:bg-gray-200 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="h-3 w-3 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-3">
                      {notification.status === 'completed' && (
                        <button
                          onClick={() => handleViewResults(notification.jobId, notification.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          View Results
                        </button>
                      )}
                      
                      {notification.status === 'failed' && (
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          <FileText className="h-3 w-3" />
                          Retry Upload
                        </button>
                      )}
                      
                      {!notification.isViewed && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 space-y-2">
        {notifications.length > 0 && (
          <button
            onClick={() => window.location.href = '/lease-processing-history'}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All Processing History
          </button>
        )}
        <button
          onClick={() => window.location.href = '/lease-status-dashboard'}
          className="w-full text-center text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          Open Status Dashboard
        </button>
      </div>
    </div>
  );
}

export default function LeaseNotificationBadge() {
  const { unreadCount, isLoading } = useLeaseNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !(event.target as Element).closest('.notification-dropdown')) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative notification-dropdown">
      <button
        onClick={toggleDropdown}
        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group hover-lift focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isOpen 
            ? 'bg-blue-100 text-blue-800' 
            : 'hover:bg-[#f8fafc] hover:text-[#4f46e5] text-text-primary'
        }`}
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
          isOpen 
            ? 'bg-blue-200' 
            : 'bg-[#f8fafc] group-hover:bg-[#e2e8f0]'
        }`}>
          <Bell className={`h-4 w-4 ${isOpen ? 'text-blue-800' : 'text-[#4f46e5]'} ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
          
          {/* Notification Badge */}
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
          )}
        </div>
        
        <div className="text-left">
          <span className="font-medium text-sm">
            Lease Analysis
          </span>
          <p className={`text-xs mt-0.5 ${
            isOpen ? 'text-blue-600' : 'text-text-muted'
          }`}>
            {unreadCount > 0 ? `${unreadCount} updates` : 'Up to date'}
          </p>
        </div>
      </button>

      <NotificationDropdown isOpen={isOpen} onClose={closeDropdown} />
    </div>
  );
}