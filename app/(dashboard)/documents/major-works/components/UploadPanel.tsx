'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Wrench } from 'lucide-react';
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
    // Check file type - Major works documents can include drawings
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'image/jpeg',
      'image/png',
      'application/dwg', // AutoCAD drawings
      'image/vnd.dwg'
    ];

    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.dwg')) {
      return {
        type: 'type',
        message: "This file type isn't supported. Please upload PDF, DOCX, XLSX, CSV, JPG, PNG, or DWG files."
      };
    }

    // Check file size (50MB default - matches server config)
    const maxSize = parseInt(process.env.NEXT_PUBLIC_DOC_REVIEW_MAX_MB || '50') * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
      const fileSizeMB = Math.round(file.size / (1024 * 1024));
      return {
        type: 'size',
        message: `File too large (${fileSizeMB}MB). Maximum size is ${maxSizeMB}MB. Please compress the file or split it into smaller parts.`
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
          message: 'File too large for upload. Please compress the file or split it into smaller parts.'
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
            ? 'border-orange-400 bg-orange-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {isUploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="text-gray-600">Uploading and processing...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-orange-100">
                <Upload className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your major works document here, or{' '}
                <label className="text-orange-600 hover:text-orange-500 cursor-pointer">
                  browse
                  <input
                    type="file"
                    accept=".pdf,.docx,.xlsx,.csv,.dwg,.jpg,.jpeg,.png"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-sm text-gray-500 mt-2">
                PDF, DOCX, XLSX, CSV, DWG, or images. Max 50 MB and 300 pages.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Contracts, specifications, drawings, invoices, and project documentation
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