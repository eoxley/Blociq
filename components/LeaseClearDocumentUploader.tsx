"use client"

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import LeaseAnalysisReport from './LeaseAnalysisReport';
import { LeaseDocumentParser } from '@/lib/lease-document-parser';

interface LeaseClearDocumentUploaderProps {
  buildingId?: string;
  onUploadComplete?: (result: any) => void;
  className?: string;
}

interface FileState {
  name: string;
  size: number;
  hash?: string;
}

export default function LeaseClearDocumentUploader({
  buildingId,
  onUploadComplete,
  className = ""
}: LeaseClearDocumentUploaderProps) {
  // State management - CRITICAL for preventing caching issues
  const [documentResults, setDocumentResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedFile, setLastProcessedFile] = useState<FileState | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Clear previous results when new file is selected - FIXES CACHING ISSUE
  const clearPreviousResults = (file: File) => {
    const fileChanged = !lastProcessedFile || 
                       lastProcessedFile.name !== file.name ||
                       lastProcessedFile.size !== file.size;

    if (fileChanged) {
      console.log('🗑️ Clearing previous results for new file:', file.name);
      console.log('📋 Previous file:', lastProcessedFile?.name, 'New file:', file.name);
      
      // CRITICAL: Clear all state to prevent "Holloway Road" caching issue
      setDocumentResults(null);
      setError(null);
      setLastProcessedFile({ name: file.name, size: file.size });
    }
  };

  // Enhanced file upload with comprehensive cache-busting
  const handleFileUpload = async (file: File) => {
    try {
      // 1. ALWAYS clear state at start - prevents caching issues
      setLoading(true);
      setError(null);
      setDocumentResults(null);
      setProcessingStatus('Preparing upload...');

      // 2. Generate unique identifiers for cache-busting
      const processingId = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}_${file.size}`;
      
      console.log(`📤 Starting LeaseClear analysis for: ${file.name}`);
      console.log(`🔑 Processing ID: ${processingId}`);

      // 3. Create cache-busting FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('processingId', processingId);
      formData.append('forceReprocess', 'true'); // Force fresh processing
      formData.append('timestamp', Date.now().toString());
      if (buildingId) {
        formData.append('buildingId', buildingId);
      }

      setProcessingStatus('Uploading document...');

      // 4. Upload with cache-busting headers
      const response = await fetch(`/api/upload-and-analyse?t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Processing-ID': processingId,
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Upload failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      setProcessingStatus('Processing with AI...');
      const result = await response.json();

      // 5. Validate response is for THIS file (prevents mix-ups)
      if (result.processingId && result.processingId !== processingId) {
        console.warn('⚠️ Response processingId mismatch:', {
          expected: processingId,
          received: result.processingId,
          fileName: file.name
        });
        console.warn('🔄 Retrying upload to ensure correct results...');
        return handleFileUpload(file); // Retry
      }

      console.log('📊 Analysis result received:', {
        hasStructuredAnalysis: !!result.leaseAnalysis,
        hasAiAnalysis: !!result.ai,
        processingId: result.processingId,
        cached: result.cached
      });

      let leaseAnalysis;

      // 6. Use structured lease analysis if available (preferred)
      if (result.leaseAnalysis) {
        console.log('✅ Using structured lease analysis from LeaseDocumentParser');
        leaseAnalysis = result.leaseAnalysis;
      } else if (result.ai?.extractedText) {
        // 7. Fallback: Parse raw OCR text with LeaseDocumentParser
        console.log('⚠️ No structured analysis, parsing OCR text with LeaseDocumentParser');
        setProcessingStatus('Parsing lease document...');
        
        const parser = new LeaseDocumentParser(
          result.ai.extractedText, 
          file.name,
          result.extractionQuality?.score
        );
        leaseAnalysis = parser.parse();
        
        console.log('📋 Parsed lease analysis:', {
          confidence: leaseAnalysis.confidence,
          sectionsFound: leaseAnalysis.sections?.length || 0,
          hasExecutiveSummary: !!leaseAnalysis.executiveSummary
        });
      } else {
        throw new Error('No extractable text found in document');
      }

      // 8. Update state with results
      setDocumentResults(leaseAnalysis);
      setLastProcessedFile({ 
        name: file.name, 
        size: file.size,
        hash: result.fileHash 
      });

      // 9. Success feedback
      const cacheStatus = result.cached ? '(from cache)' : '(fresh analysis)';
      toast.success(`Lease analyzed successfully ${cacheStatus}: ${file.name}`);
      
      console.log('✅ LeaseClear analysis complete for:', file.name);
      onUploadComplete?.(leaseAnalysis);

    } catch (error) {
      console.error('❌ LeaseClear analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      
      setError(errorMessage);
      toast.error(`Analysis failed: ${errorMessage}`);
    } finally {
      setLoading(false);
      setProcessingStatus('');
    }
  };

  // Handle file selection with validation
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select a PDF lease document');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Clear previous results and start upload
    clearPreviousResults(file);
    handleFileUpload(file);
  };

  return (
    <div className={`leaseclear-document-uploader ${className}`}>
      {/* Show upload interface if no results or loading */}
      {(!documentResults || loading) && (
        <div className="upload-section">
          <Card className="p-8 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
            <div className="text-center">
              <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Upload Lease Document
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Upload a PDF lease for professional AI-powered analysis in LeaseClear format
              </p>
              
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={loading}
                className="hidden"
                id="lease-file-upload"
              />
              
              <Button
                asChild
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                size="lg"
              >
                <label htmlFor="lease-file-upload" className="cursor-pointer">
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5 mr-2" />
                      Choose PDF Lease
                    </>
                  )}
                </label>
              </Button>
            </div>
          </Card>

          {/* Processing Status */}
          {loading && processingStatus && (
            <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 text-blue-600 mr-3 animate-spin" />
                <div className="flex-1">
                  <div className="font-medium text-blue-700">
                    {processingStatus}
                  </div>
                  {lastProcessedFile && (
                    <div className="text-sm text-blue-600 mt-1">
                      Processing: {lastProcessedFile.name}
                    </div>
                  )}
                  <div className="w-full bg-blue-200 rounded-full h-2 mt-3">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && !loading && (
        <Card className="mt-6 p-4 bg-red-50 border-red-200">
          <div className="flex items-center text-red-700">
            <AlertCircle className="h-5 w-5 mr-2" />
            <div>
              <div className="font-medium">Analysis Failed</div>
              <div className="text-sm text-red-600">{error}</div>
            </div>
          </div>
          <Button
            onClick={() => {
              setError(null);
              setDocumentResults(null);
            }}
            variant="outline"
            className="mt-3 text-red-700 border-red-300 hover:bg-red-50"
          >
            Try Another Document
          </Button>
        </Card>
      )}

      {/* Results: Professional LeaseClear Format */}
      {documentResults && !loading && !error && (
        <div className="results-section">
          {/* Back to Upload Button */}
          <div className="mb-4">
            <Button
              onClick={() => {
                setDocumentResults(null);
                setError(null);
                setLastProcessedFile(null);
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Analyze Another Lease
            </Button>
          </div>

          {/* Processing Metadata */}
          <Card className="mb-4 p-3 bg-green-50 border-green-200">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span>
                  <strong>Document Processed:</strong> {lastProcessedFile?.name}
                </span>
              </div>
              <div className="text-xs text-green-600">
                LeaseClear Format
              </div>
            </div>
          </Card>

          {/* Professional LeaseClear Report */}
          <LeaseAnalysisReport 
            leaseData={documentResults}
            fileName={lastProcessedFile?.name || 'Unknown Document'}
          />
        </div>
      )}
    </div>
  );
}
