'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Calendar, Building, User } from 'lucide-react';
import { validateComplianceFile, getFileInputAccept } from '@/lib/validation/mime';
import { useSupabase } from '@/components/SupabaseProvider';

interface ComplianceUploaderProps {
  buildingId: string;
  buildingName: string;
  onUploadSuccess: (result: any) => void;
  onClose: () => void;
}

interface UploadResult {
  job: {
    id: string;
    status: string;
    filename: string;
    doc_type: string;
    building_id: string;
    summary_json?: any;
  };
  message: string;
}

export default function ComplianceUploader({ buildingId, buildingName, onUploadSuccess, onClose }: ComplianceUploaderProps) {
  const { supabase } = useSupabase();
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [docType, setDocType] = useState('EICR');

  const handleFileUpload = async (file: File) => {
    setError(null);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Client-side validation
      const validation = validateComplianceFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file type');
        return;
      }

      setUploadProgress(25);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to upload documents');
        return;
      }

      setUploadProgress(50);

      // Upload file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('building_id', buildingId);
      formData.append('doc_type', docType);

      const response = await fetch('/api/compliance/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      setUploadProgress(75);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      setUploadProgress(100);
      setUploadResult(result);
      
      // Auto-close after 3 seconds if successful
      setTimeout(() => {
        onUploadSuccess(result);
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [docType, buildingId]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const renderUploadArea = () => (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragActive
          ? 'border-blue-400 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {isUploading ? (
        <div className="space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <div className="space-y-2">
            <p className="text-gray-600">Processing document...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">
              {uploadProgress < 50 ? 'Uploading...' : 
               uploadProgress < 75 ? 'Reading text...' : 
               uploadProgress < 100 ? 'Analysing...' : 'Updating compliance...'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div>
            <p className="text-lg font-medium text-gray-900">
              Drop your compliance document here, or{' '}
              <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                browse
                <input
                  type="file"
                  accept={getFileInputAccept()}
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              PDF, JPG or PNG. Max 50 MB.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderConfirmationCard = () => {
    if (!uploadResult?.job?.summary_json) return null;

    const summary = uploadResult.job.summary_json;
    
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
          <h3 className="text-lg font-semibold text-green-800">Document Processed Successfully</h3>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center">
              <Building className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">Building:</span>
              <span className="ml-2 font-medium">{summary.building_name || buildingName}</span>
            </div>
            
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">Inspection Date:</span>
              <span className="ml-2 font-medium">{summary.inspection_date}</span>
            </div>
            
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">Next Due:</span>
              <span className="ml-2 font-medium">{summary.next_due_date}</span>
            </div>
            
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-gray-500 mr-2" />
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`ml-2 font-medium ${
                summary.result === 'satisfactory' || summary.result === 'no_c1' 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {summary.result === 'satisfactory' ? 'Satisfactory' : 
                 summary.result === 'no_c1' ? 'No Issues' : 'Unsatisfactory'}
              </span>
            </div>
          </div>
          
          {summary.findings && summary.findings.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Findings:</h4>
              <div className="space-y-1">
                {summary.findings.map((finding: any, index: number) => (
                  <div key={index} className="text-sm text-gray-600">
                    {finding.code}: {finding.count} {finding.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 p-3 bg-green-100 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ Compliance data has been automatically updated for {buildingName}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Upload Compliance Document</h2>
              <p className="text-sm text-gray-500">{buildingName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Document Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="EICR">EICR (Electrical Installation Condition Report)</option>
                  <option value="PAT">PAT Testing</option>
                  <option value="Fire">Fire Safety Assessment</option>
                  <option value="Gas">Gas Safety Certificate</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Upload Area */}
              {!uploadResult && renderUploadArea()}

              {/* Confirmation Card */}
              {uploadResult && renderConfirmationCard()}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <p className="text-red-800">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {uploadResult ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
