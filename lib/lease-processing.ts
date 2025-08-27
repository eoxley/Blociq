/**
 * Main Lease Processing Integration for BlocIQ
 * Combines OCR processing and AI lease analysis
 */

import { processDocumentOCR, OCRResult, OCRProcessingError } from './ocr';
import { analyzeLease, LeaseAnalysis, LeaseAnalysisError } from './lease-analyzer';

export interface LeaseProcessingResult {
  ocrResult: OCRResult;
  leaseAnalysis: LeaseAnalysis;
  processingTime: number;
  success: boolean;
}

export interface LeaseProcessingError {
  message: string;
  code: 'OCR_ERROR' | 'ANALYSIS_ERROR' | 'COMBINED_ERROR' | 'UNKNOWN_ERROR';
  ocrError?: OCRProcessingError;
  analysisError?: LeaseAnalysisError;
  details?: string;
}

export interface BatchLeaseProcessingResult {
  results: LeaseProcessingResult[];
  errors: { filename: string; error: LeaseProcessingError }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    averageProcessingTime: number;
    totalProcessingTime: number;
  };
}

/**
 * Process a single lease document through OCR and AI analysis
 * @param file - The lease document file to process
 * @returns Promise<LeaseProcessingResult> - Complete processing result
 */
export async function processLeaseDocument(file: File): Promise<LeaseProcessingResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🔄 Starting lease processing for: ${file.name}`);
    
    // Step 1: OCR Processing
    console.log(`📄 Step 1: OCR processing...`);
    const ocrResult = await processDocumentOCR(file);
    console.log(`✅ OCR complete: ${ocrResult.text.length} characters extracted`);
    
    // Step 2: Lease Analysis
    console.log(`🔍 Step 2: AI lease analysis...`);
    const leaseAnalysis = await analyzeLease(ocrResult.text);
    console.log(`✅ Lease analysis complete: Confidence ${leaseAnalysis.confidence}`);
    
    const processingTime = Date.now() - startTime;
    
    const result: LeaseProcessingResult = {
      ocrResult,
      leaseAnalysis,
      processingTime,
      success: true
    };
    
    console.log(`🎉 Lease processing complete for ${file.name} in ${processingTime}ms`);
    
    return result;
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Lease processing failed for ${file.name} after ${processingTime}ms:`, error);
    
    // Determine error type and create appropriate error response
    let processingError: LeaseProcessingError;
    
    if (error && typeof error === 'object' && 'code' in error) {
      if ('ocrError' in error || error.code === 'OCR_ERROR') {
        processingError = {
          message: 'OCR processing failed',
          code: 'OCR_ERROR' as const,
          ocrError: error as OCRProcessingError,
          details: `Failed to extract text from ${file.name}`
        };
      } else if ('analysisError' in error || error.code === 'ANALYSIS_ERROR') {
        processingError = {
          message: 'Lease analysis failed',
          code: 'ANALYSIS_ERROR' as const,
          analysisError: error as LeaseAnalysisError,
          details: `Failed to analyze lease content from ${file.name}`
        };
      } else {
        processingError = {
          message: 'Unknown processing error',
          code: 'UNKNOWN_ERROR' as const,
          details: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    } else {
      processingError = {
        message: 'Lease processing failed',
        code: 'UNKNOWN_ERROR' as const,
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
    
    throw processingError;
  }
}

/**
 * Batch process multiple lease documents
 * @param files - Array of lease document files
 * @returns Promise<BatchLeaseProcessingResult> - Batch processing results
 */
export async function batchProcessLeaseDocuments(files: File[]): Promise<BatchLeaseProcessingResult> {
  console.log(`🔄 Starting batch lease processing for ${files.length} documents`);
  
  const results: LeaseProcessingResult[] = [];
  const errors: { filename: string; error: LeaseProcessingError }[] = [];
  const startTime = Date.now();
  
  // Process files sequentially to avoid overwhelming services
  for (const file of files) {
    try {
      console.log(`\n📄 Processing: ${file.name}`);
      const result = await processLeaseDocument(file);
      results.push(result);
      console.log(`✅ Successfully processed: ${file.name}`);
    } catch (error) {
      const processingError = error as LeaseProcessingError;
      errors.push({ filename: file.name, error: processingError });
      console.error(`❌ Failed to process: ${file.name}`, processingError);
    }
  }
  
  const totalProcessingTime = Date.now() - startTime;
  const total = files.length;
  const successful = results.length;
  const failed = errors.length;
  
  // Calculate average processing time
  const averageProcessingTime = successful > 0 
    ? Math.round(results.reduce((sum, r) => sum + r.processingTime, 0) / successful)
    : 0;
  
  const summary = {
    total,
    successful,
    failed,
    averageProcessingTime,
    totalProcessingTime
  };
  
  console.log(`\n📊 Batch lease processing complete:`);
  console.log(`   Total files: ${total}`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Average time: ${averageProcessingTime}ms`);
  console.log(`   Total time: ${totalProcessingTime}ms`);
  
  if (errors.length > 0) {
    console.warn(`⚠️ Failed files:`, errors.map(e => e.filename));
  }
  
  return { results, errors, summary };
}

/**
 * Validate if a file is suitable for lease processing
 */
export function validateLeaseDocument(file: File): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check file type
  const validTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/tiff',
    'image/bmp'
  ];
  
  if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
    issues.push('Invalid file type');
    recommendations.push('Upload PDF or image files only');
  }
  
  // Check file size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    issues.push('File too large');
    recommendations.push('File must be under 10MB');
  }
  
  // Check filename for lease indicators
  const filename = file.name.toLowerCase();
  const leaseKeywords = ['lease', 'agreement', 'tenancy', 'contract', 'deed'];
  const hasLeaseKeywords = leaseKeywords.some(keyword => filename.includes(keyword));
  
  if (!hasLeaseKeywords) {
    recommendations.push('Ensure this is a lease document for best analysis results');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Generate comprehensive lease processing report
 */
export function generateLeaseProcessingReport(
  results: LeaseProcessingResult[],
  errors: { filename: string; error: LeaseProcessingError }[]
): {
  summary: {
    totalDocuments: number;
    successfulProcessing: number;
    failedProcessing: number;
    successRate: number;
    averageConfidence: 'high' | 'medium' | 'low';
  };
  complianceOverview: {
    totalCompliant: number;
    totalNonCompliant: number;
    totalUnclear: number;
    complianceRate: number;
  };
  keyFindings: {
    commonRentRanges: string[];
    commonTerms: string[];
    frequentIssues: string[];
    recommendations: string[];
  };
  processingMetrics: {
    averageProcessingTime: number;
    fastestProcessing: number;
    slowestProcessing: number;
    totalProcessingTime: number;
  };
} {
  const totalDocuments = results.length + errors.length;
  const successfulProcessing = results.length;
  const failedProcessing = errors.length;
  const successRate = totalDocuments > 0 ? (successfulProcessing / totalDocuments) * 100 : 0;
  
  // Calculate confidence distribution
  let highConfidence = 0, mediumConfidence = 0, lowConfidence = 0;
  results.forEach(result => {
    switch (result.leaseAnalysis.confidence) {
      case 'high': highConfidence++; break;
      case 'medium': mediumConfidence++; break;
      case 'low': lowConfidence++; break;
    }
  });
  
  let averageConfidence: 'high' | 'medium' | 'low' = 'medium';
  if (highConfidence > mediumConfidence && highConfidence > lowConfidence) averageConfidence = 'high';
  else if (lowConfidence > highConfidence && lowConfidence > mediumConfidence) averageConfidence = 'low';
  
  // Calculate compliance overview
  let totalCompliant = 0, totalNonCompliant = 0, totalUnclear = 0;
  results.forEach(result => {
    Object.values(result.leaseAnalysis.complianceChecklist).forEach(value => {
      switch (value) {
        case 'YES': totalCompliant++; break;
        case 'NO': totalNonCompliant++; break;
        case 'UNCLEAR': totalUnclear++; break;
      }
    });
  });
  
  const totalComplianceItems = totalCompliant + totalNonCompliant + totalUnclear;
  const complianceRate = totalComplianceItems > 0 ? (totalCompliant / totalComplianceItems) * 100 : 0;
  
  // Extract key findings
  const commonRentRanges: string[] = [];
  const commonTerms: string[] = [];
  const frequentIssues: string[] = [];
  const recommendations: string[] = [];
  
  results.forEach(result => {
    // Collect rent information
    if (result.leaseAnalysis.financialObligations.rent) {
      commonRentRanges.push(result.leaseAnalysis.financialObligations.rent);
    }
    
    // Collect term information
    if (result.leaseAnalysis.propertyDetails.term) {
      commonTerms.push(result.leaseAnalysis.propertyDetails.term);
    }
    
    // Collect risk factors
    frequentIssues.push(...result.leaseAnalysis.riskFactors);
    
    // Collect recommendations
    recommendations.push(...result.leaseAnalysis.recommendations);
  });
  
  // Remove duplicates and limit results
  const uniqueRentRanges = [...new Set(commonRentRanges)].slice(0, 5);
  const uniqueTerms = [...new Set(commonTerms)].slice(0, 5);
  const uniqueIssues = [...new Set(frequentIssues)].slice(0, 10);
  const uniqueRecommendations = [...new Set(recommendations)].slice(0, 10);
  
  // Calculate processing metrics
  const processingTimes = results.map(r => r.processingTime);
  const averageProcessingTime = processingTimes.length > 0 
    ? Math.round(processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length)
    : 0;
  const fastestProcessing = processingTimes.length > 0 ? Math.min(...processingTimes) : 0;
  const slowestProcessing = processingTimes.length > 0 ? Math.max(...processingTimes) : 0;
  const totalProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0);
  
  return {
    summary: {
      totalDocuments,
      successfulProcessing,
      failedProcessing,
      successRate: Math.round(successRate * 100) / 100,
      averageConfidence
    },
    complianceOverview: {
      totalCompliant,
      totalNonCompliant,
      totalUnclear,
      complianceRate: Math.round(complianceRate * 100) / 100
    },
    keyFindings: {
      commonRentRanges: uniqueRentRanges,
      commonTerms: uniqueTerms,
      frequentIssues: uniqueIssues,
      recommendations: uniqueRecommendations
    },
    processingMetrics: {
      averageProcessingTime,
      fastestProcessing,
      slowestProcessing,
      totalProcessingTime
    }
  };
}

/**
 * Export lease processing results to various formats
 */
export function exportLeaseProcessingResults(
  results: LeaseProcessingResult[],
  format: 'json' | 'csv' | 'summary'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(results, null, 2);
    
    case 'csv':
      return generateCSVExport(results);
    
    case 'summary':
      return generateSummaryExport(results);
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Generate CSV export of lease processing results
 */
function generateCSVExport(results: LeaseProcessingResult[]): string {
  if (results.length === 0) return '';
  
  const headers = [
    'Filename',
    'Property Address',
    'Lease Term',
    'Annual Rent',
    'Service Charge',
    'Confidence',
    'Processing Time (ms)',
    'Compliance Issues',
    'Risk Factors'
  ];
  
  const rows = results.map(result => [
    result.ocrResult.filename,
    result.leaseAnalysis.propertyDetails.address,
    result.leaseAnalysis.propertyDetails.term,
    result.leaseAnalysis.financialObligations.rent,
    result.leaseAnalysis.financialObligations.serviceCharge,
    result.leaseAnalysis.confidence,
    result.processingTime,
    Object.entries(result.leaseAnalysis.complianceChecklist)
      .filter(([_, value]) => value === 'NO')
      .map(([key, _]) => key.replace(/([A-Z])/g, ' $1').trim())
      .join('; '),
    result.leaseAnalysis.riskFactors.join('; ')
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
}

/**
 * Generate summary export of lease processing results
 */
function generateSummaryExport(results: LeaseProcessingResult[]): string {
  if (results.length === 0) return 'No lease documents processed.';
  
  const report = generateLeaseProcessingReport(results, []);
  
  return `
LEASE PROCESSING SUMMARY REPORT
================================

PROCESSING OVERVIEW:
- Total Documents: ${report.summary.totalDocuments}
- Successfully Processed: ${report.summary.successfulProcessing}
- Failed Processing: ${report.summary.failedProcessing}
- Success Rate: ${report.summary.successRate}%
- Average Confidence: ${report.summary.averageConfidence.toUpperCase()}

COMPLIANCE OVERVIEW:
- Total Compliant Items: ${report.complianceOverview.totalCompliant}
- Total Non-Compliant Items: ${report.complianceOverview.totalNonCompliant}
- Total Unclear Items: ${report.complianceOverview.totalUnclear}
- Overall Compliance Rate: ${report.complianceOverview.complianceRate}%

KEY FINDINGS:
- Common Rent Ranges: ${report.keyFindings.commonRentRanges.join(', ') || 'N/A'}
- Common Terms: ${report.keyFindings.commonTerms.join(', ') || 'N/A'}
- Frequent Issues: ${report.keyFindings.frequentIssues.join(', ') || 'None identified'}
- Recommendations: ${report.keyFindings.recommendations.join(', ') || 'None provided'}

PROCESSING METRICS:
- Average Processing Time: ${report.processingMetrics.averageProcessingTime}ms
- Fastest Processing: ${report.processingMetrics.fastestProcessing}ms
- Slowest Processing: ${report.processingMetrics.slowestProcessing}ms
- Total Processing Time: ${report.processingMetrics.totalProcessingTime}ms

Generated: ${new Date().toLocaleString()}
  `.trim();
}
