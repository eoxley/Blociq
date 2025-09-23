'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { DocumentJob } from '../MajorWorksLabClient';

interface UploadPanelProps {
  onUploadSuccess: (job: DocumentJob) => void;
}

interface ValidationError {
  type: 'size' | 'pages' | 'password' | 'type' | 'unknown';
  message: string;
}

export default function UploadPanel({ onUploadSuccess }: UploadPanelProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<ValidationError | null>(null);

  const validateFile = (file: File): ValidationError | null => {
    // Check file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return {
        type: 'type',
        message: "This file type isn't supported. Please upload a PDF or DOCX."
      };
    }

    // Check file size (50MB default - matches server config)
    const maxSize = parseInt(process.env.NEXT_PUBLIC_DOC_REVIEW_MAX_MB || '50') * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      return {
        type: 'size',
        message: `File too large (${fileSizeMB}MB). Maximum size is ${maxSizeMB}MB. Please compress the PDF or split it into smaller parts.`
      };
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/major-works-lab/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        onUploadSuccess(result.job);
      } else if (response.status === 413) {
        setError({
          type: 'size',
          message: 'File too large for upload. Please compress the PDF or split it into smaller parts.'
        });
      } else {
        try {
          const result = await response.json();
          setError({
            type: result.error === 'File too large' ? 'size' : 'unknown',
            message: result.message || 'Upload failed. Please try again.'
          });
        } catch {
          setError({
            type: 'unknown',
            message: `Upload failed (${response.status}). Please try again.`
          });
        }
      }
    } catch (error) {
      setError({
        type: 'unknown',
        message: 'Upload failed. Please check your connection and try again.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        return;
      }

      handleFileUpload(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        return;
      }

      handleFileUpload(file);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload Major Works Documents</h2>
        <p className="text-gray-600">Section 20 notices, invoices, project specifications, and contractor communications</p>
      </div>

      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${isDragActive ? 'border-orange-400 bg-orange-50' : 'border-gray-300 hover:border-orange-400'}
          ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept=".pdf,.docx"
          onChange={handleFileSelect}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <div>
              <p className="text-lg font-medium text-gray-900">Processing document...</p>
              <p className="text-sm text-gray-500">This may take a few moments</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your major works document here, or click to browse
              </p>
              <p className="text-sm text-gray-500">PDF or DOCX up to 50 MB / 300 pages</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-sm text-red-700">{error.message}</p>
          </div>
        </div>
      )}

      {/* Upload Tips */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Tips for better analysis:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Section 20 notices: Include full consultation documents</li>
          <li>• Invoices: Ensure all line items and totals are clearly visible</li>
          <li>• Project specs: Upload complete technical specifications</li>
          <li>• Scan documents at 300 DPI or higher for best OCR results</li>
        </ul>
      </div>
    </div>
  );
}