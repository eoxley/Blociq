'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/components/ToastNotifications';

interface LeaseProcessingNotification {
  id: string;
  jobId: string;
  filename: string;
  status: 'completed' | 'failed' | 'processing';
  completedAt?: string;
  isViewed: boolean;
  analysisResults?: any;
  errorMessage?: string;
  priority: 'high' | 'medium' | 'low';
}

interface NotificationContextType {
  notifications: LeaseProcessingNotification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  refreshNotifications: () => Promise<void>;
  isLoading: boolean;
  getNotificationsByStatus: (status?: string) => LeaseProcessingNotification[];
}

const LeaseNotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useLeaseNotifications() {
  const context = useContext(LeaseNotificationContext);
  if (!context) {
    // Return default values when provider is not available (for pages outside dashboard)
    console.warn('useLeaseNotifications used outside provider context, returning defaults');
    return {
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      markAsRead: () => {},
      markAllAsRead: () => {},
      clearNotification: () => {},
      refreshNotifications: async () => {},
      getNotificationsByStatus: () => []
    };
  }
  return context;
}

interface LeaseNotificationProviderProps {
  children: ReactNode;
}

export function LeaseNotificationProvider({ children }: LeaseNotificationProviderProps) {
  const [notifications, setNotifications] = useState<LeaseProcessingNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showProcessingComplete, showProcessingFailed } = useToast();

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isViewed).length;

  // Fetch notifications from the server API
  const fetchNotifications = async () => {
    try {
      // Use API route instead of direct database calls
      const response = await fetch('/api/lease-jobs?type=notifications&limit=50');
      const result = await response.json().catch(() => ({ data: [] }));
      const jobs = Array.isArray(result.data) ? result.data : [];

      if (!response.ok) {
        console.error('Error fetching lease notifications:', response.status);
        return;
      }

      if (jobs && jobs.length > 0) {
        // Get stored notification states from localStorage
        const storedStates = JSON.parse(localStorage.getItem('lease_notifications_state') || '{}');
        
        const processedNotifications: LeaseProcessingNotification[] = jobs.map(job => ({
          id: `job-${job.id}`,
          jobId: job.id,
          filename: job.filename,
          status: job.status,
          completedAt: job.processing_completed_at,
          errorMessage: job.error_message,
          analysisResults: job.results || job.lease_analysis,
          isViewed: storedStates[job.id]?.isViewed || false,
          priority: job.status === 'failed' ? 'high' : 'medium'
        }));

        setNotifications(processedNotifications);
      }
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, isViewed: true } : n
    ));
    
    // Update localStorage
    const jobId = notificationId.replace('job-', '');
    const storedStates = JSON.parse(localStorage.getItem('lease_notifications_state') || '{}');
    storedStates[jobId] = { isViewed: true };
    localStorage.setItem('lease_notifications_state', JSON.stringify(storedStates));
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isViewed: true })));
    
    // Update localStorage for all notifications
    const storedStates = JSON.parse(localStorage.getItem('lease_notifications_state') || '{}');
    notifications.forEach(n => {
      const jobId = n.jobId;
      storedStates[jobId] = { isViewed: true };
    });
    localStorage.setItem('lease_notifications_state', JSON.stringify(storedStates));
  };

  // Clear specific notification
  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    // Remove from localStorage
    const jobId = notificationId.replace('job-', '');
    const storedStates = JSON.parse(localStorage.getItem('lease_notifications_state') || '{}');
    delete storedStates[jobId];
    localStorage.setItem('lease_notifications_state', JSON.stringify(storedStates));
  };

  // Get notifications by status
  const getNotificationsByStatus = (status?: string) => {
    if (!status) return notifications;
    return notifications.filter(n => n.status === status);
  };

  // Refresh notifications
  const refreshNotifications = async () => {
    setIsLoading(true);
    await fetchNotifications();
  };

  // Initialize notifications on mount
  useEffect(() => {
    fetchNotifications();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Real-time subscription to job updates
  useEffect(() => {
    const { data: { user } } = supabase.auth.getUser();
    
    user.then(({ data: userData }) => {
      if (!userData?.user) return;

      const subscription = supabase
        .channel('lease_job_updates')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'lease_processing_jobs',
          filter: `user_id=eq.${userData.user.id}`
        }, (payload) => {
          console.log('Real-time job update:', payload);
          
          // Only refresh if status changed to completed or failed
          const newJob = payload.new as any;
          const oldJob = payload.old as any;
          
          // Check if status just changed to completed or failed
          if (newJob.status !== oldJob.status && 
              (newJob.status === 'completed' || newJob.status === 'failed')) {
            
            // Show toast notification for status change
            if (newJob.status === 'completed') {
              showProcessingComplete(newJob.filename, newJob.id);
            } else if (newJob.status === 'failed') {
              showProcessingFailed(newJob.filename, newJob.error_message, newJob.id);
            }
            
            // Refresh notifications
            fetchNotifications();
          }
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    });
  }, []);

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    refreshNotifications,
    isLoading,
    getNotificationsByStatus
  };

  return (
    <LeaseNotificationContext.Provider value={contextValue}>
      {children}
    </LeaseNotificationContext.Provider>
  );
}