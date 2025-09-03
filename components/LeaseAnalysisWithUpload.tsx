"use client"

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, FileText, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import LeaseAnalysisReport from './LeaseAnalysisReport';
import { uploadDocumentWithCacheBusting } from '@/lib/document-cache-utils';

interface LeaseAnalysisWithUploadProps {
  buildingId?: string;
  className?: string;
}

interface UploadState {
  loading: boolean;
  progress: string;
  results: any | null;
  error: string | null;
  showAnalysis: boolean;
  lastProcessedFile: { name: string; size: number; hash?: string } | null;
}

export default function LeaseAnalysisWithUpload({
  buildingId,
  className = ""
}: LeaseAnalysisWithUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    loading: false,
    progress: '',
    results: null,
    error: null,
    showAnalysis: false,
    lastProcessedFile: null
  });

  // Transform API results to LeaseAnalysisReport format
  const transformToLeaseFormat = (apiResults: any, fileName: string) => {
    // If we have structured lease analysis, use it directly
    if (apiResults.leaseAnalysis) {
      console.log('✅ Using structured lease analysis from LeaseDocumentParser');
      return apiResults.leaseAnalysis;
    }

    // Fallback to AI analysis transformation
    console.log('⚠️ Using fallback AI analysis transformation');
    const ai = apiResults.ai || {};
    
    return {
      fileName: fileName,
      generatedDate: new Date().toLocaleDateString('en-GB'),
      confidence: Math.round((apiResults.extractionQuality?.score || 0.8) * 100),
      
      executiveSummary: ai.summary || ai.executive_summary || 
        "This lease document has been analyzed using AI-powered document processing. The analysis includes property details, financial terms, restrictions, and maintenance responsibilities extracted from the lease agreement.",
      
      basicDetails: {
        property: ai.property_address || ai.property_name || "Property address not clearly identified",
        leaseTerm: ai.lease_term || ai.term_years ? `${ai.term_years} years` : "Lease term not specified",
        parties: {
          lessor: ai.landlord_name || ai.lessor || "Landlord not identified",
          lessee: ai.tenant_name || ai.lessee || "Tenant not identified", 
          company: ai.management_company || ai.managing_agent || "Management company not specified"
        },
        titleNumber: ai.title_number || ai.land_registry_title || "Not specified"
      },
      
      sections: [
        {
          id: 'pets',
          title: 'Pets',
          icon: '🐕',
          content: ai.pets_policy || ai.pet_restrictions || 
            "Pet policy not clearly specified in the document. Please refer to the full lease agreement for details.",
          clauses: ai.pets_clauses || ["Clause reference not identified"]
        },
        {
          id: 'alterations',
          title: 'Alterations & Improvements',
          icon: '🔨', 
          content: ai.alterations_policy || ai.improvements_restrictions ||
            "Alteration and improvement policies not clearly specified. Please refer to the full lease agreement for details.",
          clauses: ai.alterations_clauses || ["Clause reference not identified"]
        },
        {
          id: 'repairs',
          title: 'Repairs and Maintenance Responsibilities',
          icon: '🔧',
          content: {
            lessee: ai.tenant_responsibilities || ai.lessee_repairs ||
              "Tenant repair responsibilities not clearly specified in the analysis.",
            company: ai.landlord_responsibilities || ai.management_responsibilities ||
              "Landlord/Management company responsibilities not clearly specified in the analysis."
          },
          clauses: ai.repairs_clauses || ["Clause references not identified"]
        },
        {
          id: 'serviceCharge',
          title: 'Service Charge Provisions',
          icon: '💰',
          content: {
            apportionment: ai.service_charge_percentage || ai.service_charge_split ||
              "Service charge apportionment not clearly specified.",
            financialYear: ai.service_charge_year || "Service charge year not specified",
            paymentSchedule: ai.payment_terms || ai.service_charge_payment ||
              "Payment schedule not clearly specified.",
            coveredCosts: ai.service_charge_covers || ai.covered_expenses ||
              "Covered costs not clearly specified in the analysis."
          },
          clauses: ai.service_charge_clauses || ["Clause references not identified"]
        },
        {
          id: 'groundRent',
          title: 'Ground Rent',
          icon: '🏛️',
          content: ai.ground_rent || ai.rent_amount || 
            "Ground rent terms not clearly specified in the document.",
          clauses: ai.ground_rent_clauses || ["Clause reference not identified"]
        },
        {
          id: 'nuisance',
          title: 'Nuisance and Anti-Social Behaviour',
          icon: '🔇',
          content: ai.nuisance_policy || ai.antisocial_behaviour ||
            "Nuisance and anti-social behaviour policies not clearly specified.",
          clauses: ai.nuisance_clauses || ["Clause reference not identified"]
        }
      ]
    };
  };

  // Handle file upload with cache busting
  const handleFileUpload = async (file: File) => {
    try {
      // Clear any existing results immediately
      setUploadState(prev => ({
        ...prev,
        loading: true,
        error: null,
        results: null,
        showAnalysis: false,
        progress: 'Preparing upload...',
        lastProcessedFile: { name: file.name, size: file.size }
      }));

      console.log(`📤 Starting lease analysis for: ${file.name}`);

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

      console.log('📊 Lease analysis results:', result);

      // Update state with results
      setUploadState(prev => ({
        ...prev,
        loading: false,
        results: result,
        showAnalysis: true,
        progress: '',
        lastProcessedFile: { 
          name: file.name, 
          size: file.size, 
          hash: result.fileHash 
        }
      }));

      // Show success message
      if (result.cached) {
        toast.success(`Lease analyzed (from cache): ${file.name}`);
      } else {
        toast.success(`Lease analyzed successfully: ${file.name}`);
      }

    } catch (error) {
      console.error('Lease analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      
      setUploadState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        progress: '',
        showAnalysis: false
      }));

      toast.error(`Analysis failed: ${errorMessage}`);
    }
  };

  // Handle file selection
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

    handleFileUpload(file);
  };

  // Go back to upload screen
  const handleBackToUpload = () => {
    setUploadState(prev => ({
      ...prev,
      showAnalysis: false,
      results: null,
      error: null
    }));
  };

  // If showing analysis, render the LeaseAnalysisReport
  if (uploadState.showAnalysis && uploadState.results) {
    const leaseData = transformToLeaseFormat(uploadState.results, uploadState.lastProcessedFile?.name || 'Unknown Document');
    
    return (
      <div className={className}>
        {/* Back Button */}
        <div className="mb-4">
          <Button
            onClick={handleBackToUpload}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Upload Another Lease
          </Button>
        </div>

        {/* Processing Metadata */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-700">
            <div className="flex items-center justify-between">
              <div>
                <strong>Document Processed:</strong> {uploadState.lastProcessedFile?.name}
              </div>
              <div className="text-xs">
                {uploadState.results.cached ? '⚡ From Cache' : '🔄 Fresh Analysis'}
              </div>
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Processed: {uploadState.results.processedAt} | 
              ID: {uploadState.results.processingId?.substring(0, 16)}...
            </div>
          </div>
        </div>

        {/* Render the LeaseAnalysisReport */}
        <LeaseAnalysisReport 
          leaseData={leaseData} 
          fileName={uploadState.lastProcessedFile?.name || 'Unknown Document'} 
        />
      </div>
    );
  }

  // Otherwise show the upload interface
  return (
    <div className={`lease-analysis-uploader ${className}`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-gray-700 mb-2">LeaseClear</h1>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">AI-Powered Lease Analysis</h2>
          <p className="text-gray-600">
            Upload your lease document to get a comprehensive analysis with key terms, 
            obligations, and restrictions clearly explained.
          </p>
        </div>

        {/* Upload Area */}
        <Card className="p-8 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
          <div className="text-center">
            <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload Lease Document
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Select a PDF lease document for AI-powered analysis
            </p>
            
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={uploadState.loading}
              className="hidden"
              id="lease-upload"
            />
            
            <Button
              asChild
              disabled={uploadState.loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
              size="lg"
            >
              <label htmlFor="lease-upload" className="cursor-pointer">
                {uploadState.loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Analyzing...
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

        {/* Progress Indicator */}
        {uploadState.loading && uploadState.progress && (
          <Card className="mt-6 p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center">
              <div className="animate-pulse w-full">
                <div className="flex items-center text-blue-700">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700 mr-3"></div>
                  <span className="font-medium">
                    🔄 {uploadState.progress}
                  </span>
                </div>
                {uploadState.lastProcessedFile && (
                  <div className="text-sm text-blue-600 mt-2">
                    Processing: {uploadState.lastProcessedFile.name}
                  </div>
                )}
                <div className="w-full bg-blue-200 rounded-full h-2 mt-3">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Error Display */}
        {uploadState.error && !uploadState.loading && (
          <Card className="mt-6 p-4 bg-red-50 border-red-200">
            <div className="flex items-center text-red-700">
              <AlertCircle className="h-5 w-5 mr-2" />
              <div>
                <div className="font-medium">Analysis Failed</div>
                <div className="text-sm text-red-600">{uploadState.error}</div>
              </div>
            </div>
          </Card>
        )}

        {/* Features */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Comprehensive Analysis</h3>
            <p className="text-sm text-gray-600">
              Extract key terms, obligations, and restrictions from your lease
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">AI-Powered Accuracy</h3>
            <p className="text-sm text-gray-600">
              Advanced OCR and AI analysis for reliable document understanding
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">Clear Explanations</h3>
            <p className="text-sm text-gray-600">
              Complex legal terms explained in plain English with clause references
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
