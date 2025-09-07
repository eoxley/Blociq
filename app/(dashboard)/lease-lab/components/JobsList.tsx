'use client';

import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle, Eye, Link, Download, RefreshCw } from 'lucide-react';
import { DocumentJob } from '../LeaseLabClient';

interface JobsListProps {
  jobs: DocumentJob[];
  onViewAnalysis: (job: DocumentJob) => void;
  onRefresh: () => void;
}

export default function JobsList({ jobs, onViewAnalysis, onRefresh }: JobsListProps) {
  const [refreshing, setRefreshing] = useState(false);

  // Auto-refresh every 5 seconds for jobs that are still processing
  useEffect(() => {
    const processingJobs = jobs.filter(job => 
      ['QUEUED', 'OCR', 'EXTRACT', 'SUMMARISE'].includes(job.status)
    );

    if (processingJobs.length > 0) {
      const interval = setInterval(() => {
        onRefresh();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [jobs, onRefresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
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
        return 'OCR';
      case 'EXTRACT':
        return 'Extracting';
      case 'SUMMARISE':
        return 'Summarising';
      case 'READY':
        return 'Ready';
      case 'FAILED':
        return 'Failed';
      default:
        return 'Unknown';
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

              {/* Progress Bar */}
              {['QUEUED', 'OCR', 'EXTRACT', 'SUMMARISE'].includes(job.status) && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Processing</span>
                    <span>{getProgressPercentage(job.status)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
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
              {job.status === 'READY' && (
                <button
                  onClick={() => onViewAnalysis(job)}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Analysis</span>
                </button>
              )}
              
              {job.linked_building_id && (
                <div className="flex items-center space-x-1 px-3 py-2 text-sm text-green-600 bg-green-50 rounded-lg">
                  <Link className="h-4 w-4" />
                  <span>Attached</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
