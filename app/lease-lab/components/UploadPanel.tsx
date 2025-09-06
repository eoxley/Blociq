'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { DocumentJob } from '../LeaseLabClient';

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

    // Check file size (50MB default)
    const maxSize = parseInt(process.env.NEXT_PUBLIC_DOC_REVIEW_MAX_MB || '50') * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        type: 'size',
        message: "This file is too large to process reliably. Try compressing it, splitting into parts, or contact support."
      };
    }

    // Note: Page count and password detection would need to be done server-side
    // as they require more complex analysis

    return null;
  };

  const handleFileUpload = async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/lease-lab/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        onUploadSuccess(result.job);
      } else {
        setError({
          type: 'unknown',
          message: result.message || 'Upload failed. Please try again.'
        });
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
      } else {
        handleFileUpload(file);
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      
      if (validationError) {
        setError(validationError);
      } else {
        handleFileUpload(file);
      }
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8">
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
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
            <p className="text-gray-600">Uploading and processing...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your document here, or{' '}
                <label className="text-blue-600 hover:text-blue-500 cursor-pointer">
                  browse
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                PDF or DOCX. Max 50 MB and 300 pages. Password-protected files aren't supported.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800">{error.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
