"use client";

import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface LeaseClause {
  term: string;
  text: string;
  found: boolean;
  page?: number;
}

interface ExtractionResult {
  isLease: boolean;
  confidence: number;
  clauses: Record<string, LeaseClause>;
  summary?: string;
  metadata: {
    totalPages: number;
    extractedTextLength: number;
    keyTermsFound: number;
    extractionTimestamp: string;
  };
}

export default function LeaseExtractionDemo() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a valid PDF file');
      setFile(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (buildingId) {
        formData.append('building_id', buildingId);
      }
      formData.append('document_type', 'lease');

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Extraction failed');
      }

      const data = await response.json();
      setResult(data.extraction);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const getClauseStatusIcon = (found: boolean) => {
    return found ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getClauseStatusColor = (found: boolean) => {
    return found ? 'text-green-700' : 'text-red-700';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🏠 BlocIQ Lease Extraction Demo
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload a lease PDF and automatically extract key clauses, terms, and generate summaries.
          Perfect for property managers who need to quickly analyze lease documents.
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          📄 Upload Lease Document
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Building ID (Optional) */}
          <div>
            <label htmlFor="buildingId" className="block text-sm font-medium text-gray-700 mb-2">
              Building ID (Optional)
            </label>
            <input
              type="text"
              id="buildingId"
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              placeholder="Enter building ID to link document"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* File Upload */}
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
              Select PDF File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                type="file"
                id="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file" className="cursor-pointer">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600 hover:text-blue-500">
                    Click to upload
                  </span>{' '}
                  or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">PDF files only, max 10MB</p>
              </label>
            </div>
            {file && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <FileText className="h-4 w-4 mr-2" />
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || isProcessing}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 mr-2" />
                Extract Lease Clauses
              </>
            )}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Results Display */}
      {result && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📋 Extraction Results
          </h2>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {result.isLease ? '✅' : '❌'}
              </div>
              <div className="text-sm text-blue-600">Lease Detected</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {result.metadata.keyTermsFound}
              </div>
              <div className="text-sm text-green-600">Terms Found</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(result.confidence * 100)}%
              </div>
              <div className="text-sm text-purple-600">Confidence</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">
                {result.metadata.totalPages}
              </div>
              <div className="text-sm text-orange-600">Pages</div>
            </div>
          </div>

          {/* AI Summary */}
          {result.summary && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">🤖 AI Summary</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-line">{result.summary}</p>
              </div>
            </div>
          )}

          {/* Extracted Clauses */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              📝 Extracted Clauses ({Object.keys(result.clauses).length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(result.clauses).map(([key, clause]) => (
                <div
                  key={key}
                  className={`border rounded-lg p-4 ${
                    clause.found ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{clause.term}</h4>
                    {getClauseStatusIcon(clause.found)}
                  </div>
                  <p className={`text-sm ${getClauseStatusColor(clause.found)}`}>
                    {clause.found ? clause.text : 'Clause not found in document'}
                  </p>
                  {clause.page && (
                    <p className="text-xs text-gray-500 mt-2">Page {clause.page}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Processing Details</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Extracted {result.metadata.extractedTextLength.toLocaleString()} characters</p>
              <p>Processed on {new Date(result.metadata.extractionTimestamp).toLocaleString()}</p>
              <p>Coverage: {Math.round((result.metadata.keyTermsFound / 30) * 100)}% of key terms</p>
            </div>
          </div>
        </div>
      )}

      {/* Features Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
          🚀 What This System Does
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Smart Detection</h3>
            <p className="text-sm text-gray-600">
              Automatically identifies lease documents using filename patterns and content analysis
            </p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Clause Extraction</h3>
            <p className="text-sm text-gray-600">
              Extracts 30+ key lease terms with surrounding context using advanced regex patterns
            </p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">AI Summarization</h3>
            <p className="text-sm text-gray-600">
              Generates intelligent summaries and identifies missing clauses for compliance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
