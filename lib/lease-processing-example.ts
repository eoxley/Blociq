/**
 * Example: Complete Lease Document Processing Pipeline
 * Shows how to use the OCR and lease analyzer utilities together
 */

import { processDocumentOCR, validateOCRQuality } from './ocr';
import { analyzeLease, generateComplianceSummary, extractKeyDates } from './lease-analyzer';

export interface LeaseProcessingResult {
  filename: string;
  ocrResult: {
    text: string;
    confidence?: number;
    processingTime?: number;
    quality: boolean;
  };
  leaseAnalysis?: {
    propertyDetails: any;
    financialObligations: any;
    complianceChecklist: any;
    complianceSummary: string;
    keyDates: Array<{ date: string; description: string; type: string }>;
  };
  error?: string;
  processingTime: number;
}

/**
 * Complete lease document processing pipeline
 * @param file - Lease document file to process
 * @returns Promise<LeaseProcessingResult> - Complete processing result
 */
export async function processLeaseDocument(file: File): Promise<LeaseProcessingResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Starting lease processing for: ${file.name}`);
    
    // Step 1: OCR Processing
    console.log('📄 Step 1: Processing document through OCR...');
    const ocrResult = await processDocumentOCR(file, {
      enhanceText: true,
      extractTables: true
    });
    
    // Validate OCR quality
    const ocrQuality = validateOCRQuality(ocrResult);
    
    if (!ocrQuality) {
      return {
        filename: file.name,
        ocrResult: {
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          processingTime: ocrResult.processingTime,
          quality: false
        },
        error: 'OCR quality below threshold - document may be unclear or low quality',
        processingTime: Date.now() - startTime
      };
    }
    
    console.log(`✅ OCR completed: ${ocrResult.text.length} characters extracted`);
    
    // Step 2: Lease Analysis
    console.log('🔍 Step 2: Analyzing lease content...');
    const leaseAnalysis = await analyzeLease(ocrResult.text, {
      includeComplianceChecklist: true,
      extractFinancialDetails: true,
      analyzeServiceProvisions: true
    });
    
    // Generate compliance summary
    const complianceSummary = generateComplianceSummary(leaseAnalysis);
    
    // Extract key dates
    const keyDates = extractKeyDates(leaseAnalysis);
    
    console.log(`✅ Lease analysis completed with ${leaseAnalysis.metadata.confidence * 100}% confidence`);
    
    const totalProcessingTime = Date.now() - startTime;
    
    return {
      filename: file.name,
      ocrResult: {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        processingTime: ocrResult.processingTime,
        quality: true
      },
      leaseAnalysis: {
        propertyDetails: leaseAnalysis.propertyDetails,
        financialObligations: leaseAnalysis.financialObligations,
        complianceChecklist: leaseAnalysis.complianceChecklist,
        complianceSummary,
        keyDates
      },
      processingTime: totalProcessingTime
    };
    
  } catch (error) {
    console.error(`❌ Lease processing failed for ${file.name}:`, error);
    
    return {
      filename: file.name,
      ocrResult: {
        text: '',
        quality: false
      },
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Batch process multiple lease documents
 * @param files - Array of lease document files
 * @returns Promise<LeaseProcessingResult[]> - Array of processing results
 */
export async function processMultipleLeaseDocuments(files: File[]): Promise<LeaseProcessingResult[]> {
  console.log(`🚀 Starting batch processing for ${files.length} lease documents`);
  
  const results: LeaseProcessingResult[] = [];
  
  for (const file of files) {
    try {
      const result = await processLeaseDocument(file);
      results.push(result);
      
      if (result.error) {
        console.warn(`⚠️ Warning for ${file.name}: ${result.error}`);
      } else {
        console.log(`✅ Successfully processed: ${file.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to process ${file.name}:`, error);
      
      results.push({
        filename: file.name,
        ocrResult: {
          text: '',
          quality: false
        },
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: 0
      });
    }
  }
  
  // Generate summary statistics
  const successful = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;
  const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);
  
  console.log(`📊 Batch processing complete:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏱️ Total processing time: ${totalProcessingTime}ms`);
  
  return results;
}

/**
 * Generate lease portfolio summary
 * @param results - Array of lease processing results
 * @returns Object with portfolio statistics
 */
export function generateLeasePortfolioSummary(results: LeaseProcessingResult[]) {
  const successfulResults = results.filter(r => !r.error && r.leaseAnalysis);
  
  if (successfulResults.length === 0) {
    return {
      totalLeases: 0,
      averageCompliance: 0,
      commonIssues: [],
      totalProperties: 0,
      averageProcessingTime: 0
    };
  }
  
  // Calculate compliance statistics
  const complianceScores = successfulResults.map(result => {
    const checklist = result.leaseAnalysis!.complianceChecklist;
    const totalItems = Object.keys(checklist).length;
    const compliantItems = Object.values(checklist).filter(Boolean).length;
    return (compliantItems / totalItems) * 100;
  });
  
  const averageCompliance = complianceScores.reduce((sum, score) => sum + score, 0) / complianceScores.length;
  
  // Identify common compliance issues
  const allChecklists = successfulResults.map(r => r.leaseAnalysis!.complianceChecklist);
  const commonIssues: string[] = [];
  
  // Check which compliance items are most commonly missing
  const checklistKeys = Object.keys(allChecklists[0]);
  checklistKeys.forEach(key => {
    const missingCount = allChecklists.filter(checklist => !checklist[key]).length;
    const missingPercentage = (missingCount / allChecklists.length) * 100;
    
    if (missingPercentage > 50) {
      commonIssues.push(`${key.replace(/([A-Z])/g, ' $1').trim()}: ${missingPercentage.toFixed(1)}% missing`);
    }
  });
  
  // Calculate processing statistics
  const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);
  const averageProcessingTime = totalProcessingTime / results.length;
  
  return {
    totalLeases: results.length,
    successfulLeases: successfulResults.length,
    averageCompliance: Math.round(averageCompliance),
    commonIssues,
    totalProperties: successfulResults.length,
    averageProcessingTime: Math.round(averageProcessingTime)
  };
}
