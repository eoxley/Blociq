'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UploadResponse {
  success: boolean;
  jobId?: string;
  documentId?: string;
  filename?: string;
  message?: string;
  error?: string;
  estimatedProcessingTime?: string;
  checkStatusUrl?: string;
}

interface JobStatus {
  success: boolean;
  jobId: string;
  documentId: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  progress: number;
  message: string;
  estimatedTimeRemaining?: string;
  statusColor: string;
  isComplete: boolean;
  results?: any;
  error?: any;
  urls?: {
    results?: string;
    retry?: string;
  };
}

export default function AsyncLeaseUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [buildingId, setBuildingId] = useState<string>('');
  const [priority, setPriority] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files && files[0]) {
      setFile(files[0]);
    }
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        alert('Please log in to upload documents');
        setIsUploading(false);
        return;
      }
      
      const formData = new FormData();
      formData.append('file', file);
      if (buildingId) formData.append('buildingId', buildingId);
      if (priority > 0) formData.append('priority', priority.toString());
      
      const response = await fetch('/api/lease-processing/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });
      
      const result: UploadResponse = await response.json();
      
      if (result.success && result.jobId) {
        setUploadResponse(result);
        // Start monitoring the job
        startJobMonitoring(result.jobId, session.access_token);
      } else {
        alert(`Upload failed: ${result.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const startJobMonitoring = async (jobId: string, accessToken: string) => {
    setIsMonitoring(true);
    
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/lease-processing/status/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (response.ok) {
          const status: JobStatus = await response.json();
          setJobStatus(status);
          
          // Stop monitoring if job is complete or failed permanently
          if (status.isComplete || (status.status === 'failed' && !status.urls?.retry)) {
            setIsMonitoring(false);
            return false; // Stop polling
          }
        } else {
          console.error('Failed to check job status:', response.status);
        }
        
        return true; // Continue polling
      } catch (error) {
        console.error('Status check error:', error);
        return true; // Continue polling on error
      }
    };
    
    // Initial check
    await checkStatus();
    
    // Poll every 10 seconds
    const pollInterval = setInterval(async () => {
      const shouldContinue = await checkStatus();
      if (!shouldContinue) {
        clearInterval(pollInterval);
      }
    }, 10000);
    
    // Cleanup on component unmount
    return () => {
      clearInterval(pollInterval);
      setIsMonitoring(false);
    };
  };
  
  const handleRetryJob = async () => {
    if (!jobStatus?.jobId || !jobStatus.urls?.retry) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const response = await fetch(jobStatus.urls.retry, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        // Restart monitoring
        startJobMonitoring(jobStatus.jobId, session.access_token);
      } else {
        const error = await response.json();
        alert(`Retry failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Retry error:', error);
      alert('Failed to retry job');
    }
  };
  
  const handleViewResults = () => {
    if (jobStatus?.urls?.results) {
      router.push(`/lease-analysis/${jobStatus.jobId}`);
    }
  };
  
  const resetForm = () => {
    setFile(null);
    setUploadResponse(null);
    setJobStatus(null);
    setIsMonitoring(false);
    setBuildingId('');
    setPriority(0);
  };
  
  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };
  
  return (
    <div className=\"max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg\">
      <h2 className=\"text-2xl font-bold text-gray-900 mb-6\">
        📄 Background Lease Analysis
      </h2>
      
      <p className=\"text-gray-600 mb-6\">
        Upload your lease document for comprehensive analysis. Processing happens in the background 
        with no timeout limits, and you'll receive an email notification when complete.
      </p>
      
      {!uploadResponse ? (
        <div className=\"space-y-6\">
          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${\n              dragActive \n                ? 'border-blue-400 bg-blue-50' \n                : 'border-gray-300 hover:border-gray-400'\n            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className=\"space-y-4\">
                <div className=\"text-green-600\">✅ File Selected</div>
                <div className=\"text-sm text-gray-600\">
                  <div className=\"font-medium\">{file.name}</div>
                  <div>{formatFileSize(file.size)} • {file.type}</div>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className=\"text-red-500 text-sm hover:text-red-700\"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className=\"space-y-4\">
                <div className=\"text-4xl\">📄</div>
                <div>
                  <p className=\"text-lg font-medium text-gray-900\">
                    Drop your lease document here
                  </p>
                  <p className=\"text-sm text-gray-500\">
                    or click to browse files
                  </p>
                </div>
                <input
                  type=\"file\"
                  onChange={handleFileChange}
                  accept=\".pdf,.jpg,.jpeg,.png,.tiff,.webp\"
                  className=\"absolute inset-0 w-full h-full opacity-0 cursor-pointer\"
                />
              </div>
            )}
          </div>
          
          {/* Additional Options */}
          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-2\">
                Building (Optional)
              </label>
              <input
                type=\"text\"
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                placeholder=\"Building ID or name\"
                className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
              />
            </div>
            
            <div>
              <label className=\"block text-sm font-medium text-gray-700 mb-2\">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className=\"w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500\"
              >
                <option value={0}>Normal Priority</option>
                <option value={1}>High Priority</option>
                <option value={2}>Urgent</option>
              </select>
            </div>
          </div>
          
          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className={`w-full py-3 px-4 rounded-md font-medium transition-colors ${\n              !file || isUploading\n                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'\n                : 'bg-blue-600 text-white hover:bg-blue-700'\n            }`}
          >
            {isUploading ? '🔄 Uploading...' : '🚀 Start Background Analysis'}
          </button>
          
          {/* Info Box */}
          <div className=\"bg-blue-50 border border-blue-200 rounded-md p-4\">
            <h3 className=\"font-medium text-blue-900 mb-2\">✨ What happens next?</h3>
            <ul className=\"text-sm text-blue-800 space-y-1\">
              <li>• Your document is uploaded and queued for processing</li>
              <li>• Analysis runs in the background (5-10 minutes typically)</li>
              <li>• You'll receive an email when analysis is complete</li>
              <li>• No timeout issues - even very large documents are handled</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className=\"space-y-6\">
          {/* Upload Success */}
          <div className=\"bg-green-50 border border-green-200 rounded-md p-4\">
            <div className=\"flex items-center space-x-3\">
              <div className=\"text-green-500 text-xl\">✅</div>
              <div>
                <h3 className=\"font-medium text-green-900\">Upload Successful!</h3>
                <p className=\"text-sm text-green-700\">{uploadResponse.message}</p>
              </div>
            </div>
          </div>
          
          {/* Job Status */}
          {jobStatus && (
            <div className=\"border rounded-lg p-6\">
              <div className=\"flex items-center justify-between mb-4\">
                <h3 className=\"font-medium text-gray-900\">Processing Status</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${\n                  jobStatus.statusColor === 'green' ? 'bg-green-100 text-green-800' :\n                  jobStatus.statusColor === 'blue' ? 'bg-blue-100 text-blue-800' :\n                  jobStatus.statusColor === 'orange' ? 'bg-orange-100 text-orange-800' :\n                  jobStatus.statusColor === 'red' ? 'bg-red-100 text-red-800' :\n                  'bg-gray-100 text-gray-800'\n                }`}>                \n                  {jobStatus.status.toUpperCase()}\n                </span>\n              </div>\n              \n              <div className=\"space-y-3\">\n                <div>\n                  <div className=\"flex justify-between text-sm text-gray-600 mb-1\">\n                    <span>Progress</span>\n                    <span>{jobStatus.progress}%</span>\n                  </div>\n                  <div className=\"w-full bg-gray-200 rounded-full h-2\">\n                    <div \n                      className={`h-2 rounded-full transition-all duration-300 ${\n                        jobStatus.statusColor === 'green' ? 'bg-green-500' :\n                        jobStatus.statusColor === 'orange' ? 'bg-orange-500' :\n                        jobStatus.statusColor === 'red' ? 'bg-red-500' :\n                        'bg-blue-500'\n                      }`}\n                      style={{ width: `${jobStatus.progress}%` }}\n                    />\n                  </div>\n                </div>\n                \n                <div className=\"text-sm text-gray-600\">\n                  <div><strong>Document:</strong> {jobStatus.filename}</div>\n                  <div><strong>Status:</strong> {jobStatus.message}</div>\n                  {jobStatus.estimatedTimeRemaining && (\n                    <div><strong>Time Remaining:</strong> {jobStatus.estimatedTimeRemaining}</div>\n                  )}\n                </div>\n                \n                {/* Action Buttons */}\n                <div className=\"flex space-x-3 pt-3\">\n                  {jobStatus.isComplete && jobStatus.urls?.results && (\n                    <button\n                      onClick={handleViewResults}\n                      className=\"px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium\"\n                    >\n                      📊 View Results\n                    </button>\n                  )}\n                  \n                  {jobStatus.status === 'failed' && jobStatus.urls?.retry && (\n                    <button\n                      onClick={handleRetryJob}\n                      className=\"px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium\"\n                    >\n                      🔄 Retry Analysis\n                    </button>\n                  )}\n                  \n                  <button\n                    onClick={resetForm}\n                    className=\"px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium\"\n                  >\n                    📤 Upload Another Document\n                  </button>\n                </div>\n                \n                {/* Error Details */}\n                {jobStatus.error && (\n                  <div className=\"bg-red-50 border border-red-200 rounded-md p-3 mt-3\">\n                    <div className=\"text-sm text-red-800\">\n                      <div className=\"font-medium\">Error Details:</div>\n                      <div>{jobStatus.error.message}</div>\n                      {jobStatus.error.canRetry && (\n                        <div className=\"text-xs mt-1 text-red-600\">\n                          Retry attempt {jobStatus.error.retryCount} of {3}\n                        </div>\n                      )}\n                    </div>\n                  </div>\n                )}\n              </div>\n            </div>\n          )}\n          \n          {/* Live Monitoring Indicator */}\n          {isMonitoring && (\n            <div className=\"flex items-center space-x-2 text-sm text-gray-500\">\n              <div className=\"animate-pulse w-2 h-2 bg-blue-500 rounded-full\"></div>\n              <span>Live monitoring active - status updates every 10 seconds</span>\n            </div>\n          )}\n        </div>\n      )}\n    </div>\n  );\n}"