'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  TrendingUp,
  ChevronRight,
  Loader2,
  Lock
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useLeaseSystemReadiness } from '@/hooks/useLeaseSystemReadiness';
import { useLeaseNotifications } from '@/contexts/LeaseNotificationContext';
import { calculateJobStats, type ProcessingJob } from '@/components/LeaseProcessingStatus';

interface CompactLeaseProcessingWidgetProps {
  className?: string;
  showTitle?: boolean;
}

export default function CompactLeaseProcessingWidget({ 
  className = '', 
  showTitle = true 
}: CompactLeaseProcessingWidgetProps) {
  // Safe hook usage - will return defaults if outside provider context
  const { unreadCount, isLoading } = useLeaseNotifications();
  const { isReady: leaseSystemReady, isLoading: leaseSystemLoading } = useLeaseSystemReadiness();
  const [recentJobs, setRecentJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentJobs();
  }, []);

  const fetchRecentJobs = async () => {
    try {
      // Safe destructuring to prevent "Right side of assignment cannot be destructured" error
      const authResult = await supabase.auth.getUser();
      const authData = authResult?.data || {}
      const user = authData.user || null
      
      if (!user) return;

      const { data, error } = await supabase
        .from('lease_processing_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching recent jobs:', error);
        return;
      }

      if (data) {
        setRecentJobs(data);
      }
    } catch (error) {
      console.error('Error in fetchRecentJobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = calculateJobStats(recentJobs);
  const activeJobs = recentJobs.filter(job => 
    job.status === 'processing' || job.status === 'retrying'
  );
  const recentCompletedJobs = recentJobs
    .filter(job => job.status === 'completed')
    .slice(0, 3);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Lease Processing
            </h3>
            {unreadCount > 0 && (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            )}
          </div>
          {leaseSystemReady ? (
            <Link
              href="/lease-lab"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View All
              <ChevronRight className="h-3 w-3" />
            </Link>
          ) : (
            <button
              disabled
              className="text-sm text-gray-400 cursor-not-allowed font-medium flex items-center gap-1"
              title="Lease processing system not ready"
            >
              <Lock className="h-3 w-3" />
              Setup Required
            </button>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 mb-1">
            {activeJobs.length}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" />
            Active
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 mb-1">
            {stats.completed}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Complete
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-1">
            {stats.failed}
          </div>
          <div className="text-xs text-gray-500 flex items-center justify-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </div>
        </div>
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-600" />
            Currently Processing
          </h4>
          <div className="space-y-2">
            {activeJobs.slice(0, 2).map((job) => (
              <div 
                key={job.id} 
                className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100"
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {job.filename}
                  </p>
                  <p className="text-xs text-gray-600">
                    {job.status === 'retrying' ? `Retry ${job.retry_count}` : 'Processing...'}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {(job.file_size / (1024 * 1024)).toFixed(1)} MB
                </div>
              </div>
            ))}
            {activeJobs.length > 2 && (
              <Link 
                href="/lease-lab"
                className="block text-xs text-blue-600 hover:text-blue-700 text-center py-1"
              >
                +{activeJobs.length - 2} more processing
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Recent Completions */}
      {recentCompletedJobs.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Recently Completed
          </h4>
          <div className="space-y-2">
            {recentCompletedJobs.map((job) => (
              leaseSystemReady ? (
                <Link
                  key={job.id}
                  href={`/lease-lab`}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group"
                >
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                      {job.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {job.processing_duration_ms 
                        ? `${Math.round(job.processing_duration_ms / 1000)}s processing`
                        : 'Completed'
                      }
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                </Link>
              ) : (
                <div
                  key={job.id}
                  className="flex items-center gap-3 p-2 rounded-lg opacity-60 cursor-not-allowed"
                  title="Lease processing system not ready"
                >
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {job.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {job.processing_duration_ms 
                        ? `${Math.round(job.processing_duration_ms / 1000)}s processing`
                        : 'Completed'
                      }
                    </p>
                  </div>
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Success Rate */}
      {stats.total > 0 && (
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <TrendingUp className="h-4 w-4" />
              Success Rate
            </div>
            <div className="font-semibold text-gray-900">
              {stats.successRate.toFixed(1)}%
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.successRate}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.completed} successful of {stats.completed + stats.failed} completed
          </div>
        </div>
      )}

      {/* Empty State */}
      {recentJobs.length === 0 && (
        <div className="text-center py-6">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-2">No processing jobs yet</p>
          <p className="text-xs text-gray-400">
            Upload lease documents to start processing
          </p>
        </div>
      )}
    </div>
  );
}