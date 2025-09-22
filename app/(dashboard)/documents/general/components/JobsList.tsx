'use client';

import { DocumentJob } from '../GeneralLabClient';
import { Clock, CheckCircle, AlertCircle, Eye, FileText, RefreshCw } from 'lucide-react';

interface JobsListProps {
  jobs: DocumentJob[];
  onViewAnalysis: (job: DocumentJob) => void;
  onRefresh: () => void;
  category: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'READY':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'FAILED':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Clock className="h-5 w-5 text-yellow-500" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'QUEUED':
      return 'Queued';
    case 'OCR':
      return 'Processing OCR';
    case 'EXTRACT':
      return 'Extracting Data';
    case 'SUMMARISE':
      return 'Analyzing';
    case 'READY':
      return 'Ready';
    case 'FAILED':
      return 'Failed';
    default:
      return status;
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
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function JobsList({ jobs, onViewAnalysis, onRefresh, category }: JobsListProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {jobs.length} {jobs.length === 1 ? 'document' : 'documents'}
        </p>
        <button
          onClick={onRefresh}
          className="flex items-center text-sm text-blue-600 hover:text-blue-700"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </button>
      </div>

      {jobs.map((job) => (
        <div
          key={job.id}
          className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4 flex-1">
              <div className="flex-shrink-0">
                <div className="p-2 rounded-lg bg-blue-50">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  {getStatusIcon(job.status)}
                  <span className="text-sm font-medium text-gray-900">
                    {getStatusText(job.status)}
                  </span>
                </div>

                <h3 className="text-lg font-medium text-gray-900 mb-2 truncate">
                  {job.filename}
                </h3>

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{formatFileSize(job.size_bytes)}</span>
                  {job.page_count && <span>{job.page_count} pages</span>}
                  <span>{formatDate(job.created_at)}</span>
                </div>

                {job.doc_type_guess && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {job.doc_type_guess}
                    </span>
                  </div>
                )}

                {job.error_message && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-600">{job.error_message}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              {job.status === 'READY' && (
                <button
                  onClick={() => onViewAnalysis(job)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Eye className="h-4 w-4 mr-1" />
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