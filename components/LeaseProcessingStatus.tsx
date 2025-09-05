'use client';

import React from 'react';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  TrendingUp, 
  Activity,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface ProcessingJob {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  created_at: string;
  processing_started_at?: string;
  processing_completed_at?: string;
  processing_duration_ms?: number;
  file_size: number;
  file_type: string;
  error_message?: string;
  retry_count: number;
  priority: number;
  ocr_source?: string;
  progress_percentage?: number;
}

interface LeaseProcessingStatusProps {
  jobs: ProcessingJob[];
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export function getStatusIcon(status: string, animated: boolean = true) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'processing':
      return <Clock className={`h-4 w-4 text-blue-500 ${animated ? 'animate-spin' : ''}`} />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'retrying':
      return <RefreshCw className={`h-4 w-4 text-orange-500 ${animated ? 'animate-spin' : ''}`} />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'retrying':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getStatusBadgeColor(status: string) {
  switch (status) {
    case 'completed':
      return 'bg-green-500';
    case 'failed':
      return 'bg-red-500';
    case 'processing':
      return 'bg-blue-500';
    case 'pending':
      return 'bg-yellow-500';
    case 'retrying':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
}

export function calculateJobStats(jobs: ProcessingJob[]) {
  const stats = {
    total: jobs.length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    processing: jobs.filter(j => j.status === 'processing' || j.status === 'retrying').length,
    pending: jobs.filter(j => j.status === 'pending').length,
    avgProcessingTime: 0,
    successRate: 0
  };

  const completedJobs = jobs.filter(j => j.status === 'completed' && j.processing_duration_ms);
  if (completedJobs.length > 0) {
    stats.avgProcessingTime = completedJobs.reduce((sum, job) => 
      sum + (job.processing_duration_ms || 0), 0) / completedJobs.length;
  }

  const finishedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'failed');
  if (finishedJobs.length > 0) {
    stats.successRate = (stats.completed / finishedJobs.length) * 100;
  }

  return stats;
}

interface ProcessingStatsProps {
  jobs: ProcessingJob[];
  showTrends?: boolean;
  className?: string;
}

export function ProcessingStats({ jobs, showTrends = false, className = '' }: ProcessingStatsProps) {
  const stats = calculateJobStats(jobs);

  return (
    <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-600">Total Jobs</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        {showTrends && (
          <div className="text-xs text-gray-500 mt-1">All time</div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-600">Completed</span>
        </div>
        <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
        {showTrends && stats.total > 0 && (
          <div className="text-xs text-green-500 mt-1">
            {Math.round((stats.completed / stats.total) * 100)}% of total
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm font-medium text-red-600">Failed</span>
        </div>
        <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
        {showTrends && stats.total > 0 && (
          <div className="text-xs text-red-500 mt-1">
            {Math.round((stats.failed / stats.total) * 100)}% of total
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">Processing</span>
        </div>
        <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
        {showTrends && (
          <div className="text-xs text-blue-500 mt-1">Active now</div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">Success Rate</span>
        </div>
        <div className="text-2xl font-bold text-purple-600">
          {stats.successRate.toFixed(1)}%
        </div>
        {showTrends && stats.avgProcessingTime > 0 && (
          <div className="text-xs text-purple-500 mt-1">
            Avg: {Math.round(stats.avgProcessingTime / 1000)}s
          </div>
        )}
      </div>
    </div>
  );
}

interface ActiveJobsListProps {
  jobs: ProcessingJob[];
  onJobClick?: (job: ProcessingJob) => void;
  className?: string;
}

export function ActiveJobsList({ jobs, onJobClick, className = '' }: ActiveJobsListProps) {
  const activeJobs = jobs.filter(job => 
    job.status === 'processing' || job.status === 'retrying' || job.status === 'pending'
  );

  if (activeJobs.length === 0) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 text-center ${className}`}>
        <Zap className="h-8 w-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No active processing jobs</p>
        <p className="text-xs text-gray-400 mt-1">Upload documents to start processing</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-600" />
          Active Processing Jobs
        </h3>
        <p className="text-sm text-gray-500 mt-1">{activeJobs.length} jobs in progress</p>
      </div>
      
      <div className="divide-y divide-gray-100">
        {activeJobs.map((job) => (
          <div
            key={job.id}
            className={`p-4 hover:bg-gray-50 transition-colors ${
              onJobClick ? 'cursor-pointer' : ''
            }`}
            onClick={() => onJobClick?.(job)}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {getStatusIcon(job.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {job.filename}
                  </p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>
                    Started {formatDistanceToNow(new Date(job.processing_started_at || job.created_at), { addSuffix: true })}
                  </span>
                  
                  {job.retry_count > 0 && (
                    <span className="text-orange-600">
                      Retry #{job.retry_count}
                    </span>
                  )}
                  
                  <span>
                    {(job.file_size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>

                {job.progress_percentage !== undefined && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${job.progress_percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {job.progress_percentage}% complete
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LeaseProcessingStatus({ 
  jobs, 
  showDetails = true, 
  compact = false, 
  className = '' 
}: LeaseProcessingStatusProps) {
  if (compact) {
    const activeCount = jobs.filter(j => 
      j.status === 'processing' || j.status === 'retrying'
    ).length;
    
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {activeCount > 0 ? (
          <>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-600 font-medium">
              {activeCount} processing
            </span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-600 font-medium">
              All complete
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <ProcessingStats jobs={jobs} showTrends={showDetails} />
      
      {showDetails && (
        <ActiveJobsList jobs={jobs} />
      )}
    </div>
  );
}