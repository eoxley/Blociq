"use client";

import React, { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface EnhancedDocumentUploadProps {
  buildingId?: string;
  onUploadComplete?: (document: any) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  multiple?: boolean;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in MB
}

interface UploadStatus {
  id: string;
  fileName: string;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  suggestions?: string[];
  extractedText?: string;
  documentType?: string;
  summary?: string;
}

export default function EnhancedDocumentUpload({
  buildingId,
  onUploadComplete,
  onUploadError,
  className = "",
  multiple = false,
  acceptedFileTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'],
  maxFileSize = 10
}: EnhancedDocumentUploadProps) {
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): { valid: boolean; error?: string; suggestions?: string[] } => {
    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFileTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: 'Unsupported file type',
        suggestions: [
          'Convert the file to PDF format',
          'Upload a text-based version',
          `Use one of these formats: ${acceptedFileTypes.join(', ')}`
        ]
      };
    }

    // Check file size
    const maxSizeBytes = maxFileSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: 'File too large',
        suggestions: [
          'Compress the file',
          'Split into smaller files',
          `Keep files under ${maxFileSize}MB`
        ]
      };
    }

    // Check for empty files
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File is empty',
        suggestions: [
          'Select a valid file with content',
          'Check that the file is not corrupted'
        ]
      };
    }

    return { valid: true };
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`);
        if (onUploadError) {
          onUploadError(`${file.name}: ${validation.error}`);
        }
        continue;
      }

      const uploadId = Math.random().toString(36).substr(2, 9);
      const uploadStatus: UploadStatus = {
        id: uploadId,
        fileName: file.name,
        status: 'uploading',
        progress: 0
      };

      setUploadStatuses(prev => [...prev, uploadStatus]);

      try {
        // Simulate upload progress
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setUploadStatuses(prev => 
            prev.map(status => 
              status.id === uploadId 
                ? { ...status, progress: i }
                : status
            )
          );
        }

        // Update status to processing
        setUploadStatuses(prev => 
          prev.map(status => 
            status.id === uploadId 
              ? { ...status, status: 'processing', progress: 100 }
              : status
          )
        );

        // Process the file
        const formData = new FormData();
        formData.append('file', file);
        if (buildingId) {
          formData.append('building_id', buildingId);
        }

        const response = await fetch('/api/documents/upload-enhanced', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (response.ok && result.success) {
          // Update status to completed
          setUploadStatuses(prev => 
            prev.map(status => 
              status.id === uploadId 
                ? { 
                    ...status, 
                    status: 'completed',
                    extractedText: result.document.extracted_text,
                    documentType: result.document.classification,
                    summary: result.document.summary
                  }
                : status
            )
          );

          toast.success(`${file.name} uploaded and processed successfully`);
          
          if (onUploadComplete) {
            onUploadComplete(result.document);
          }
        } else {
          throw new Error(result.error || 'Upload failed');
        }

      } catch (error: any) {
        console.error(`❌ Upload error for ${file.name}:`, error);
        
        let errorMessage = error.message || 'Upload failed';
        let suggestions: string[] = [];

        if (error.message.includes('OCR') || error.message.includes('scanned')) {
          errorMessage = 'This appears to be a scanned document';
          suggestions = [
            'Upload a text-based version',
            'Use OCR processing service',
            'Convert to searchable PDF'
          ];
        } else if (error.message.includes('corrupted') || error.message.includes('invalid')) {
          errorMessage = 'File appears to be corrupted';
          suggestions = [
            'Try uploading a different version',
            'Check that the file is not corrupted',
            'Convert to a different format'
          ];
        } else if (error.message.includes('unsupported')) {
          errorMessage = 'Unsupported file type';
          suggestions = [
            'Convert to PDF format',
            'Upload a text-based version',
            'Use supported file types'
          ];
        }

        // Update status to error
        setUploadStatuses(prev => 
          prev.map(status => 
            status.id === uploadId 
              ? { 
                  ...status, 
                  status: 'error',
                  error: errorMessage,
                  suggestions
                }
              : status
          )
        );

        toast.error(`${file.name}: ${errorMessage}`);
        
        if (onUploadError) {
          onUploadError(`${file.name}: ${errorMessage}`);
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const removeUploadStatus = (id: string) => {
    setUploadStatuses(prev => prev.filter(status => status.id !== id));
  };

  const getStatusIcon = (status: UploadStatus['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: UploadStatus['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400" />
            <p className="text-sm text-gray-600 mb-2">
              Drag & drop files here or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                click to browse
              </button>
            </p>
            <p className="text-xs text-gray-500">
              Supports {acceptedFileTypes.join(', ')} (max {maxFileSize}MB each)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple={multiple}
              accept={acceptedFileTypes.join(',')}
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload Status */}
      {uploadStatuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Upload Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadStatuses.map((status) => (
                <div key={status.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(status.status)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{status.fileName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(status.status)}>
                          {status.status}
                        </Badge>
                        {status.status === 'uploading' && (
                          <span className="text-xs text-gray-500">
                            {status.progress}%
                          </span>
                        )}
                      </div>
                      {status.error && (
                        <div className="mt-2">
                          <p className="text-xs text-red-600">{status.error}</p>
                          {status.suggestions && (
                            <ul className="text-xs text-gray-600 mt-1">
                              {status.suggestions.map((suggestion, index) => (
                                <li key={index}>• {suggestion}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      {status.summary && (
                        <p className="text-xs text-gray-600 mt-1">
                          {status.summary}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeUploadStatus(status.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 