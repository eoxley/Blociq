'use client';

import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle, Eye, RefreshCw, Wrench, DollarSign, Calendar, Building2 } from 'lucide-react';
import { DocumentJob } from '../MajorWorksLabClient';

interface JobsListProps {
  jobs: DocumentJob[];
  onViewAnalysis: (job: DocumentJob) => void;
  onRefresh: () => void;
  category: string;
}

export default function JobsList({ jobs, onViewAnalysis, onRefresh, category }: JobsListProps) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'READY':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'QUEUED':
      case 'OCR':
      case 'EXTRACT':
      case 'SUMMARISE':
        return <Clock className="h-5 w-5 text-orange-500 animate-pulse" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'QUEUED': return 'Queued for processing';
      case 'OCR': return 'Extracting text';
      case 'EXTRACT': return 'Analyzing content';
      case 'SUMMARISE': return 'Generating summary';
      case 'READY': return 'Analysis complete';
      case 'FAILED': return 'Processing failed';
      default: return status;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{jobs.length} document{jobs.length !== 1 ? 's' : ''}</p>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {jobs.map((job) => (
        <div key={job.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="flex-shrink-0">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Wrench className="h-5 w-5 text-orange-600" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{job.filename}</h3>
                  {job.doc_type_guess && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {job.doc_type_guess}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    <span>{formatFileSize(job.size_bytes)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                  {job.page_count && (
                    <div className="flex items-center gap-1">
                      <span>{job.page_count} pages</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {getStatusIcon(job.status)}
                  <span className="text-sm text-gray-600">{getStatusText(job.status)}</span>
                </div>

                {job.linked_building_id && (
                  <div className="mt-2 flex items-center gap-1 text-sm text-blue-600">
                    <Building2 className="h-4 w-4" />
                    <span>Linked to building</span>
                  </div>
                )}

                {job.error_message && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    {job.error_message}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              {job.status === 'READY' && (
                <button
                  onClick={() => onViewAnalysis(job)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                >
                  <Eye className="h-4 w-4" />
                  View Analysis
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}