'use client';

import { useState, useEffect, useRef } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle, Eye, Link, Download, RefreshCw, Trash2, Wrench } from 'lucide-react';
import { DocumentJob } from '../LeaseLabClient';
import { toast } from 'sonner';

interface JobsListProps {
  jobs: DocumentJob[];
  onViewAnalysis: (job: DocumentJob) => void;
  onRefresh: () => void;
  onDelete?: (jobId: string) => void;
}

export default function JobsList({ jobs, onViewAnalysis, onRefresh }: JobsListProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [deletingJobs, setDeletingJobs] = useState<Set<string>>(new Set());
  const [reprocessingJobs, setReprocessingJobs] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Debug: Log props changes (reduced logging)
  useEffect(() => {
    console.log('🔍 JobsList updated:', {
      jobsCount: jobs.length,
      statuses: jobs.map(job => job.status)
    });
  }, [jobs.length]);

  // Auto-refresh every 5 seconds for jobs that are still processing
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const processingJobs = jobs.filter(job =>
      ['QUEUED', 'OCR', 'EXTRACT', 'SUMMARISE'].includes(job.status)
    );

    if (processingJobs.length > 0 && !refreshing) {
      console.log(`🔄 Setting up auto-refresh for ${processingJobs.length} processing jobs`);
      intervalRef.current = setInterval(() => {
        // Only refresh if document is visible and not already refreshing
        if (!document.hidden && !refreshing) {
          console.log('🔄 Auto-refresh triggered');
          onRefresh();
        }
      }, 5000);
    }

    // Cleanup interval on unmount or when no processing jobs
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobs.map(job => `${job.id}-${job.status}`).join(','), refreshing]); // Use job IDs and statuses as dependency

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  const handleDelete = async (jobId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingJobs(prev => new Set([...prev, jobId]));

    try {
      console.log('🗑️ Attempting to delete job:', jobId);
      const response = await fetch(`/api/lease-lab/jobs/${jobId}`, {
        method: 'DELETE'
      });

      console.log('📡 Delete response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Delete successful:', responseData);
        toast.success('Analysis deleted successfully');
        // Only refresh after successful API call - this will remove the job from UI
        console.log('🔄 Refreshing jobs list after successful delete...');
        console.log('🔄 onRefresh function:', typeof onRefresh);
        if (onRefresh) {
          await onRefresh(); // Refresh the jobs list
          console.log('✅ Jobs list refreshed');
        } else {
          console.error('❌ onRefresh function is not available');
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Delete failed:', errorData);
        throw new Error(errorData.message || 'Failed to delete analysis');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete analysis');
      // Don't call onDelete or refresh on error - job should remain in UI
    } finally {
      setDeletingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  const handleReprocess = async (jobId: string, filename: string) => {
    if (!confirm(`Reprocess analysis for "${filename}"? This will regenerate the analysis data.`)) {
      return;
    }

    setReprocessingJobs(prev => new Set([...prev, jobId]));

    try {
      console.log('🔄 Attempting to reprocess job:', jobId);
      const response = await fetch('/api/lease-lab/reprocess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId })
      });

      console.log('📡 Reprocess response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Reprocess successful:', responseData);
        toast.success('Analysis regenerated successfully');
        // Refresh to show updated analysis
        if (onRefresh) {
          await onRefresh();
          console.log('✅ Jobs list refreshed after reprocess');
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Reprocess failed:', errorData);
        throw new Error(errorData.message || 'Failed to reprocess analysis');
      }
    } catch (error) {
      console.error('Error reprocessing job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reprocess analysis');
    } finally {
      setReprocessingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  const getStatusIcon = (status: DocumentJob['status']) => {
    switch (status) {
      case 'QUEUED':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'OCR':
      case 'EXTRACT':
      case 'SUMMARISE':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'READY':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: DocumentJob['status']) => {
    switch (status) {
      case 'QUEUED':
        return 'Queued';
      case 'OCR':
        return 'Reading Document';
      case 'EXTRACT':
        return 'Extracting Data';
      case 'SUMMARISE':
        return 'AI Analysis';
      case 'READY':
        return 'Ready';
      case 'FAILED':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const getProgressMessage = (status: DocumentJob['status'], filename: string) => {
    const fileSize = filename.includes('_') ? 'large document' : 'document';
    
    switch (status) {
      case 'QUEUED':
        return `Your ${fileSize} is in the queue and will start processing shortly.`;
      case 'OCR':
        return `Reading through your ${fileSize} with advanced OCR technology. This is a large document so grab a cup of tea! ☕`;
      case 'EXTRACT':
        return `Extracting key information from your lease document. Almost there!`;
      case 'SUMMARISE':
        return `Our AI is analyzing clauses, dates, and obligations. Just a moment longer...`;
      default:
        return '';
    }
  };

  const getStatusColor = (status: DocumentJob['status']) => {
    switch (status) {
      case 'QUEUED':
        return 'bg-yellow-100 text-yellow-800';
      case 'OCR':
      case 'EXTRACT':
      case 'SUMMARISE':
        return 'bg-blue-100 text-blue-800';
      case 'READY':
        return 'bg-green-100 text-green-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (status: DocumentJob['status']) => {
    switch (status) {
      case 'QUEUED':
        return 10;
      case 'OCR':
        return 30;
      case 'EXTRACT':
        return 60;
      case 'SUMMARISE':
        return 80;
      case 'READY':
        return 100;
      case 'FAILED':
        return 0;
      default:
        return 0;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          {jobs.length} {jobs.length === 1 ? 'analysis' : 'analyses'}
        </h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {jobs.map((job) => (
        <div key={job.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <h4 className="text-lg font-medium text-gray-900 truncate">
                  {job.filename}
                </h4>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                  {getStatusIcon(job.status)}
                  <span className="ml-1">{getStatusText(job.status)}</span>
                </span>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                <span>{formatFileSize(job.size_bytes)}</span>
                {job.page_count && <span>{job.page_count} pages</span>}
                {job.doc_type_guess && <span>• {job.doc_type_guess}</span>}
                <span>• {formatDate(job.created_at)}</span>
              </div>

              {/* Processing Banner */}
              {['QUEUED', 'OCR', 'EXTRACT', 'SUMMARISE'].includes(job.status) && (
                <div className="mb-3">
                  {/* Don't Refresh Warning */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-900 mb-1">
                          Processing in progress...
                        </h4>
                        <p className="text-sm text-blue-800 mb-2">
                          {getProgressMessage(job.status, job.filename)}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-blue-700">
                          <span className="flex items-center space-x-1">
                            <RefreshCw className="h-3 w-3" />
                            <span>Please don't refresh the page</span>
                          </span>
                          <span>•</span>
                          <span>This page will update automatically</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{getStatusText(job.status)}</span>
                    <span>{getProgressPercentage(job.status)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${getProgressPercentage(job.status)}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {job.status === 'FAILED' && job.error_message && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{job.error_message}</p>
                </div>
              )}

              {/* Ready Banner */}
              {job.status === 'READY' && (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Analysis complete — clauses, dates and action points are available.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 ml-4">
              {job.status === 'READY' && job.summary_json && (
                <button
                  onClick={() => onViewAnalysis(job)}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Analysis</span>
                </button>
              )}

              {/* Reprocess Button - for jobs that are READY but missing analysis */}
              {job.status === 'READY' && !job.summary_json && (
                <button
                  onClick={() => handleReprocess(job.id, job.filename)}
                  disabled={reprocessingJobs.has(job.id)}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-orange-600 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Regenerate analysis"
                >
                  {reprocessingJobs.has(job.id) ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wrench className="h-4 w-4" />
                  )}
                  <span>Regenerate</span>
                </button>
              )}

              {job.linked_building_id && (
                <div className="flex items-center space-x-1 px-3 py-2 text-sm text-green-600 bg-green-50 rounded-lg">
                  <Link className="h-4 w-4" />
                  <span>Attached</span>
                </div>
              )}

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(job.id, job.filename)}
                disabled={deletingJobs.has(job.id)}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete analysis"
              >
                {deletingJobs.has(job.id) ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
