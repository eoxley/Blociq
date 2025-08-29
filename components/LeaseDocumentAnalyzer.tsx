"use client";

import React, { useState } from 'react';
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import LeaseAnalysisDisplay from './LeaseAnalysisDisplay';

interface LeaseAnalysisResult {
  documentType: 'lease';
  filename: string;
  summary: string;
  keyDates: {
    description: string;
    date: string;
    type: 'start' | 'end' | 'review' | 'payment' | 'other';
  }[];
  actionItems: {
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: 'financial' | 'compliance' | 'maintenance' | 'legal';
    dueDate?: string;
  }[];
  riskAssessment: {
    overall: 'low' | 'medium' | 'high';
    factors: string[];
    mitigation: string[];
  };
  complianceStatus: 'compliant' | 'requires_review' | 'non_compliant' | 'unknown';
  extractedText: string;
  detailedAnalysis: any;
}

export default function LeaseDocumentAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<LeaseAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (selectedFile: File) => {
    if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/'))) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Please select a PDF or image file');
      setFile(null);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileChange(selectedFile);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    const selectedFile = event.dataTransfer.files[0];
    if (selectedFile) {
      handleFileChange(selectedFile);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        // Remove the data:mime;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      // Convert file to base64
      const base64Image = await convertToBase64(file);

      const response = await fetch('/api/documents/analyze-comprehensive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64Image,
          filename: file.name,
          documentType: 'lease'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      
      // Check if the response has the expected lease analysis structure
      if (data.analysisResult) {
        setResult(data.analysisResult);
      } else if (data.documentType === 'lease') {
        setResult(data);
      } else {
        throw new Error('Document analysis did not return lease data');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // If we have results, show them
  if (result) {
    return (
      <div>
        <div className="mb-4">
          <button
            onClick={() => setResult(null)}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Analyze another document
          </button>
        </div>
        <LeaseAnalysisDisplay result={result} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🏠 Lease Document Analyzer
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload a lease document and get comprehensive analysis with OCR text extraction,
          compliance checking, risk assessment, and actionable insights.
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          📄 Upload Lease Document
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Document (PDF or Image)
            </label>
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                type="file"
                id="file"
                accept=".pdf,image/*"
                onChange={handleInputChange}
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
                <p className="text-xs text-gray-500 mt-1">
                  PDF files or images (PNG, JPG, etc.) up to 10MB
                </p>
              </label>
            </div>
            
            {file && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center text-sm text-gray-600">
                  <FileText className="h-4 w-4 mr-2" />
                  <span className="font-medium">{file.name}</span>
                  <span className="ml-2 text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
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
                Analyzing Document...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 mr-2" />
                Analyze Lease Document
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

        {/* Processing Status */}
        {isProcessing && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
              <div>
                <p className="text-blue-700 font-medium">Processing your document...</p>
                <p className="text-blue-600 text-sm">This includes OCR extraction and AI analysis</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Features Overview */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
          🚀 What This Analysis Provides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">OCR Extraction</h3>
            <p className="text-sm text-gray-600">
              Google Vision OCR to extract text from any document format
            </p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-green-600 text-lg">📅</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Key Dates</h3>
            <p className="text-sm text-gray-600">
              Identifies lease start, end, review dates and payment schedules
            </p>
          </div>
          <div className="text-center">
            <div className="bg-yellow-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-yellow-600 text-lg">⚠️</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Risk Assessment</h3>
            <p className="text-sm text-gray-600">
              Evaluates compliance gaps and potential legal risks
            </p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-purple-600 text-lg">✅</span>
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Action Items</h3>
            <p className="text-sm text-gray-600">
              Prioritized recommendations for compliance and maintenance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}