"use client"

import React, { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, FileText, AlertCircle, CheckCircle, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  generateFileHash, 
  generateProcessingId, 
  createCacheBustingFormData,
  validateResponseForFile,
  uploadDocumentWithCacheBusting 
} from '@/lib/document-cache-utils';

interface DocumentUploaderProps {
  buildingId?: string;
  onUploadComplete?: (result: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface UploadState {
  loading: boolean;
  progress: string;
  results: any | null;
  error: string | null;
  lastProcessedFile: { name: string; size: number; hash?: string } | null;
  canCancel: boolean;
}

export default function DocumentUploaderWithCacheBusting({
  buildingId,
  onUploadComplete,
  onError,
  className = ""
}: DocumentUploaderProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [uploadState, setUploadState] = useState<UploadState>({
    loading: false,
    progress: '',
    results: null,
    error: null,
    lastProcessedFile: null,
    canCancel: false
  });

  // Cancel upload function
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setUploadState(prev => ({
        ...prev,
        loading: false,
        progress: '',
        error: 'Upload cancelled by user',
        canCancel: false
      }));
      toast.error('Upload cancelled');
    }
  }, []);

  // Delete/clear results function
  const deleteResults = useCallback(() => {
    setUploadState({
      loading: false,
      progress: '',
      results: null,
      error: null,
      lastProcessedFile: null,
      canCancel: false
    });
    toast.success('Results cleared');
  }, []);

  // Clear previous results when new file is selected
  const clearPreviousResults = useCallback((file: File) => {
    const fileChanged = !uploadState.lastProcessedFile || 
                       uploadState.lastProcessedFile.name !== file.name ||
                       uploadState.lastProcessedFile.size !== file.size;

    if (fileChanged) {
      console.log('🗑️ Clearing previous document results for new file:', file.name);
      setUploadState(prev => ({
        ...prev,
        results: null,
        error: null,
        lastProcessedFile: { name: file.name, size: file.size }
      }));
    }
  }, [uploadState.lastProcessedFile]);

  // Enhanced file upload with cache busting
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();
      
      // Clear any existing results immediately
      clearPreviousResults(file);
      
      setUploadState(prev => ({
        ...prev,
        loading: true,
        error: null,
        progress: 'Preparing upload...',
        canCancel: true
      }));

      // Generate unique identifiers for this upload
      const processingId = generateProcessingId(file);
      const fileHash = await generateFileHash(file);

      console.log(`📤 Uploading file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`🔑 Processing ID: ${processingId}`);
      console.log(`#️⃣ File hash: ${fileHash.substring(0, 16)}...`);

      // Update progress callback
      const updateProgress = (status: string) => {
        setUploadState(prev => ({ ...prev, progress: status }));
      };

      // Use the cache-busting upload utility
      const result = await uploadDocumentWithCacheBusting(
        file,
        '/api/upload-and-analyse',
        buildingId ? { buildingId } : {},
        updateProgress
      );

      // Verify the result is for THIS file
      if (!validateResponseForFile(result, processingId, file.name)) {
        console.warn('⚠️ Received result for different file, retrying...');
        // Retry the upload
        return handleFileUpload(file);
      }

      // Update state with results
      setUploadState(prev => ({
        ...prev,
        loading: false,
        results: result,
        progress: '',
        canCancel: false,
        lastProcessedFile: { 
          name: file.name, 
          size: file.size, 
          hash: fileHash 
        }
      }));

      // Show success message
      if (result.cached) {
        toast.success(`Document processed (from cache): ${file.name}`);
      } else {
        toast.success(`Document processed successfully: ${file.name}`);
      }

      // Call completion callback
      onUploadComplete?.(result);

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setUploadState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        progress: '',
        canCancel: false
      }));

      toast.error(`Upload failed: ${errorMessage}`);
      onError?.(errorMessage);
    }
  }, [buildingId, clearPreviousResults, onUploadComplete, onError]);

  // Handle file selection
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a PDF file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    handleFileUpload(file);
  }, [handleFileUpload]);

  return (
    <div className={`document-uploader-cache-busting ${className}`}>
      {/* Upload Area */}
      <Card className="p-6 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload Document for Analysis
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Select a PDF file to analyze with AI-powered document processing
          </p>
          
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={uploadState.loading}
            className="hidden"
            id="file-upload-cache-busting"
          />
          
          <Button
            asChild
            disabled={uploadState.loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <label htmlFor="file-upload-cache-busting" className="cursor-pointer">
              {uploadState.loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Choose PDF File
                </>
              )}
            </label>
          </Button>
        </div>
      </Card>

      {/* Progress Indicator */}
      {uploadState.loading && uploadState.progress && (
        <Card className="mt-4 p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="animate-pulse flex-1">
              <div className="flex items-center text-blue-700">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                <span className="font-medium">
                  🔄 {uploadState.progress}
                </span>
              </div>
              {uploadState.lastProcessedFile && (
                <div className="text-sm text-blue-600 mt-1">
                  Processing: {uploadState.lastProcessedFile.name}
                </div>
              )}
            </div>
            {uploadState.canCancel && (
              <Button
                onClick={cancelUpload}
                variant="outline"
                size="sm"
                className="ml-4 text-red-600 border-red-300 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Error Display */}
      {uploadState.error && !uploadState.loading && (
        <Card className="mt-4 p-4 bg-red-50 border-red-200">
          <div className="flex items-center text-red-700">
            <AlertCircle className="h-5 w-5 mr-2" />
            <div>
              <div className="font-medium">Upload Failed</div>
              <div className="text-sm text-red-600">{uploadState.error}</div>
            </div>
          </div>
        </Card>
      )}

      {/* Results Display */}
      {uploadState.results && !uploadState.loading && (
        <Card className="mt-4 p-4 bg-green-50 border-green-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-green-700 mb-2">
                  Document Processed Successfully
                </div>
              
              {/* Processing Metadata */}
              <div className="text-xs text-gray-500 space-y-1 mb-3">
                <div>Processed: {uploadState.results.processedAt}</div>
                {uploadState.results.cached && (
                  <div className="text-orange-600">⚡ Result from cache</div>
                )}
                {uploadState.results.processingId && (
                  <div>ID: {uploadState.results.processingId}</div>
                )}
              </div>

              {/* Analysis Results */}
              {uploadState.results.ai && (
                <div className="space-y-2">
                  <div className="text-sm">
                    <strong>Document Type:</strong> {uploadState.results.ai.document_type || 'Unknown'}
                  </div>
                  {uploadState.results.ai.property_address && (
                    <div className="text-sm">
                      <strong>Property:</strong> {uploadState.results.ai.property_address}
                    </div>
                  )}
                  {uploadState.results.ai.summary && (
                    <div className="text-sm">
                      <strong>Summary:</strong> {uploadState.results.ai.summary.substring(0, 200)}...
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
            
            <Button
              onClick={deleteResults}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
