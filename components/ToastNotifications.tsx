'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  X, 
  Eye, 
  RefreshCw,
  Clock,
  FileText
} from 'lucide-react';
// Using CSS animations instead of framer-motion for better compatibility
import { useRouter } from 'next/navigation';

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  actionLabel?: string;
  actionCallback?: () => void;
  persistent?: boolean;
  jobId?: string;
  timestamp: Date;
}

interface ToastContextType {
  notifications: ToastNotification[];
  showToast: (notification: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  hideToast: (id: string) => void;
  clearAll: () => void;
  showProcessingComplete: (filename: string, jobId: string) => void;
  showProcessingFailed: (filename: string, error?: string, jobId?: string) => void;
  showProcessingStarted: (filename: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return default values when provider is not available (for pages outside dashboard)
    console.warn('useToast used outside provider context, returning defaults');
    return {
      notifications: [],
      showToast: () => {},
      hideToast: () => {},
      clearAll: () => {},
      showProcessingComplete: () => {},
      showProcessingFailed: () => {},
      showProcessingStarted: () => {}
    };
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

export function ToastProvider({ 
  children, 
  maxToasts = 5, 
  defaultDuration = 5000 
}: ToastProviderProps) {
  // Add CSS animation for progress bar (client-side only)
  const [isClient, setIsClient] = useState(false);

  React.useEffect(() => {
    setIsClient(true);
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shrink {
        from { width: 100%; }
        to { width: 0%; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const [notificationIdCounter, setNotificationIdCounter] = useState(1);
  const router = useRouter();

  const showToast = (notification: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = `notification-${notificationIdCounter}`;
    setNotificationIdCounter(prev => prev + 1);
    const newNotification: ToastNotification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration ?? defaultDuration
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, maxToasts);
    });

    // Auto-hide non-persistent notifications
    if (!notification.persistent && newNotification.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newNotification.duration);
    }
  };

  const hideToast = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Helper methods for common lease processing notifications
  const showProcessingComplete = (filename: string, jobId: string) => {
    showToast({
      type: 'success',
      title: 'Processing Complete!',
      message: `Successfully processed ${filename}`,
      actionLabel: 'View Results',
      actionCallback: () => router.push(`/lease-analysis/${jobId}`),
      duration: 8000,
      jobId
    });
  };

  const showProcessingFailed = (filename: string, error?: string, jobId?: string) => {
    showToast({
      type: 'error',
      title: 'Processing Failed',
      message: error || `Failed to process ${filename}`,
      actionLabel: 'Retry',
      actionCallback: () => {
        // This would trigger a retry - implementation depends on your retry logic
        console.log('Retry processing for:', filename);
      },
      persistent: true,
      jobId
    });
  };

  const showProcessingStarted = (filename: string) => {
    showToast({
      type: 'info',
      title: 'Processing Started',
      message: `Started processing ${filename}`,
      duration: 3000
    });
  };

  return (
    <ToastContext.Provider value={{
      notifications,
      showToast,
      hideToast,
      clearAll,
      showProcessingComplete,
      showProcessingFailed,
      showProcessingStarted
    }}>
      {children}
      <ToastContainer notifications={notifications} onHide={hideToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  notifications: ToastNotification[];
  onHide: (id: string) => void;
}

function ToastContainer({ notifications, onHide }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {notifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onHide={onHide}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  notification: ToastNotification;
  onHide: (id: string) => void;
}

function ToastItem({ notification, onHide }: ToastItemProps) {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <FileText className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      default:
        return 'text-blue-800';
    }
  };

  return (
    <div
      className={`relative w-full max-w-sm bg-white border rounded-lg shadow-lg transition-all duration-300 transform animate-in slide-in-from-right-5 ${getBackgroundColor()}`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${getTextColor()}`}>
              {notification.title}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {notification.message}
            </p>
            
            {notification.actionLabel && notification.actionCallback && (
              <div className="mt-3">
                <button
                  onClick={() => {
                    notification.actionCallback?.();
                    onHide(notification.id);
                  }}
                  className={`inline-flex items-center gap-1 text-sm font-medium hover:underline ${
                    notification.type === 'success' 
                      ? 'text-green-700 hover:text-green-800'
                      : notification.type === 'error'
                      ? 'text-red-700 hover:text-red-800'
                      : 'text-blue-700 hover:text-blue-800'
                  }`}
                >
                  {notification.type === 'success' && <Eye className="h-3 w-3" />}
                  {notification.type === 'error' && <RefreshCw className="h-3 w-3" />}
                  {notification.actionLabel}
                </button>
              </div>
            )}
          </div>
          
          <button
            onClick={() => onHide(notification.id)}
            className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Progress bar for timed notifications */}
      {notification.duration && notification.duration > 0 && !notification.persistent && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div
            className={`h-full transition-all ease-linear ${
              notification.type === 'success' 
                ? 'bg-green-500'
                : notification.type === 'error'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}
            style={{
              width: '100%',
              animation: `shrink ${notification.duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
}

// Hook for integration with lease processing notifications
export function useLeaseProcessingToasts() {
  const { showProcessingComplete, showProcessingFailed, showProcessingStarted } = useToast();

  return {
    notifyProcessingComplete: showProcessingComplete,
    notifyProcessingFailed: showProcessingFailed,
    notifyProcessingStarted: showProcessingStarted
  };
}