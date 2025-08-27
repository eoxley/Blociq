/**
 * Usage Examples for BlocIQ Lease Processing System
 * Demonstrates how to integrate OCR + AI lease analysis
 */

import { processLeaseDocument, batchProcessLeaseDocuments, validateLeaseDocument } from './lease-processing';
import { processDocumentOCR } from './ocr';
import { analyzeLease } from './lease-analyzer';

// Example 1: Process a single lease document
export async function exampleSingleLeaseProcessing(file: File) {
  try {
    console.log('🔄 Example 1: Single lease document processing');
    
    // Validate the file first
    const validation = validateLeaseDocument(file);
    if (!validation.isValid) {
      console.warn('⚠️ File validation issues:', validation.issues);
      console.log('💡 Recommendations:', validation.recommendations);
      return;
    }
    
    // Process the lease document
    const result = await processLeaseDocument(file);
    
    console.log('✅ Processing complete!');
    console.log(`📄 File: ${result.ocrResult.filename}`);
    console.log(`🏠 Property: ${result.leaseAnalysis.propertyDetails.address}`);
    console.log(`💰 Rent: ${result.leaseAnalysis.financialObligations.rent}`);
    console.log(`📊 Confidence: ${result.leaseAnalysis.confidence}`);
    console.log(`⏱️ Processing time: ${result.processingTime}ms`);
    
    // Access specific compliance checklist items
    const compliance = result.leaseAnalysis.complianceChecklist;
    console.log(`🛡️ Term Consent in favour of Client: ${compliance.termConsentInFavourOfClient}`);
    console.log(`💰 Reserve Fund: ${compliance.reserveFund}`);
    console.log(`🚗 Parking Rights: ${compliance.parkingRights}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Single lease processing failed:', error);
    throw error;
  }
}

// Example 2: Process multiple lease documents
export async function exampleBatchLeaseProcessing(files: File[]) {
  try {
    console.log('🔄 Example 2: Batch lease document processing');
    
    // Filter and validate files
    const validFiles: File[] = [];
    const invalidFiles: { file: File; issues: string[] }[] = [];
    
    files.forEach(file => {
      const validation = validateLeaseDocument(file);
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push({ file, issues: validation.issues });
      }
    });
    
    if (invalidFiles.length > 0) {
      console.warn('⚠️ Some files have validation issues:', invalidFiles);
    }
    
    if (validFiles.length === 0) {
      console.log('❌ No valid files to process');
      return;
    }
    
    // Process all valid files
    const result = await batchProcessLeaseDocuments(validFiles);
    
    console.log('✅ Batch processing complete!');
    console.log(`📊 Summary: ${result.summary.successful}/${result.summary.total} successful`);
    console.log(`⏱️ Average processing time: ${result.summary.averageProcessingTime}ms`);
    
    // Show results for each file
    result.results.forEach((item, index) => {
      console.log(`\n📄 ${index + 1}. ${item.ocrResult.filename}`);
      console.log(`   🏠 ${item.leaseAnalysis.propertyDetails.address}`);
      console.log(`   💰 ${item.leaseAnalysis.financialObligations.rent}`);
      console.log(`   📊 ${item.leaseAnalysis.confidence} confidence`);
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Batch lease processing failed:', error);
    throw error;
  }
}

// Example 3: Step-by-step processing (for custom workflows)
export async function exampleStepByStepProcessing(file: File) {
  try {
    console.log('🔄 Example 3: Step-by-step lease processing');
    
    // Step 1: OCR Processing only
    console.log('📄 Step 1: OCR Processing...');
    const ocrResult = await processDocumentOCR(file);
    console.log(`✅ OCR complete: ${ocrResult.text.length} characters extracted`);
    
    // Step 2: Lease Analysis only
    console.log('🔍 Step 2: Lease Analysis...');
    const leaseAnalysis = await analyzeLease(ocrResult.text);
    console.log(`✅ Analysis complete: Confidence ${leaseAnalysis.confidence}`);
    
    // Step 3: Custom processing logic
    console.log('⚙️ Step 3: Custom Processing...');
    
    // Example: Check for specific compliance issues
    const complianceIssues = Object.entries(leaseAnalysis.complianceChecklist)
      .filter(([_, value]) => value === 'NO')
      .map(([key, _]) => key.replace(/([A-Z])/g, ' $1').trim());
    
    if (complianceIssues.length > 0) {
      console.log(`⚠️ Compliance issues found: ${complianceIssues.join(', ')}`);
    } else {
      console.log('✅ No compliance issues identified');
    }
    
    // Example: Extract financial summary
    const financialSummary = {
      rent: leaseAnalysis.financialObligations.rent,
      serviceCharge: leaseAnalysis.financialObligations.serviceCharge,
      groundRent: leaseAnalysis.financialObligations.groundRent,
      totalAnnualCost: 'Calculate based on extracted values'
    };
    
    console.log('💰 Financial Summary:', financialSummary);
    
    return {
      ocrResult,
      leaseAnalysis,
      complianceIssues,
      financialSummary
    };
    
  } catch (error) {
    console.error('❌ Step-by-step processing failed:', error);
    throw error;
  }
}

// Example 4: Integration with existing document upload flow
export async function exampleDocumentUploadIntegration(
  file: File, 
  buildingId: string,
  onProgress?: (stage: string, progress: number) => void
) {
  try {
    console.log('🔄 Example 4: Document upload integration');
    
    // Simulate progress updates
    onProgress?.('validation', 10);
    
    // Validate file
    const validation = validateLeaseDocument(file);
    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.issues.join(', ')}`);
    }
    
    onProgress?.('ocr_processing', 30);
    
    // Process lease document
    const result = await processLeaseDocument(file);
    
    onProgress?.('analysis_complete', 90);
    
    // Store results in database (example)
    const documentData = {
      id: Date.now().toString(),
      filename: file.name,
      buildingId,
      documentType: 'Lease Agreement',
      ocrText: result.ocrResult.text,
      leaseAnalysis: result.leaseAnalysis,
      processingTime: result.processingTime,
      confidence: result.leaseAnalysis.confidence,
      uploadedAt: new Date().toISOString(),
      status: 'processed'
    };
    
    // Example: Save to database
    // await saveDocumentToDatabase(documentData);
    
    onProgress?.('complete', 100);
    
    console.log('✅ Document upload integration complete');
    console.log('📊 Document data:', documentData);
    
    return documentData;
    
  } catch (error) {
    console.error('❌ Document upload integration failed:', error);
    onProgress?.('error', 0);
    throw error;
  }
}

// Example 5: Error handling and retry logic
export async function exampleErrorHandlingWithRetry(
  file: File, 
  maxRetries: number = 3
): Promise<any> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${file.name}`);
      
      const result = await processLeaseDocument(file);
      console.log(`✅ Success on attempt ${attempt}`);
      return result;
      
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  console.error(`❌ All ${maxRetries} attempts failed for ${file.name}`);
  throw new Error(`Failed to process ${file.name} after ${maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
}

// Example 6: Compliance monitoring and alerts
export function exampleComplianceMonitoring(leaseAnalysis: any) {
  console.log('🔄 Example 6: Compliance monitoring');
  
  const compliance = leaseAnalysis.complianceChecklist;
  const alerts: string[] = [];
  
  // Check for critical compliance issues
  if (compliance.termConsentInFavourOfClient === 'NO') {
    alerts.push('🚨 CRITICAL: Term consent not in favour of client');
  }
  
  if (compliance.reserveFund === 'NO') {
    alerts.push('⚠️ WARNING: No reserve fund provisions');
  }
  
  if (compliance.parkingRights === 'NO') {
    alerts.push('⚠️ WARNING: No parking rights specified');
  }
  
  if (compliance.rightOfAccess === 'NO') {
    alerts.push('⚠️ WARNING: No right of access provisions');
  }
  
  // Check for unclear items that need review
  const unclearItems = Object.entries(compliance)
    .filter(([_, value]) => value === 'UNCLEAR')
    .map(([key, _]) => key.replace(/([A-Z])/g, ' $1').trim());
  
  if (unclearItems.length > 0) {
    alerts.push(`🔍 REVIEW NEEDED: ${unclearItems.length} unclear compliance items: ${unclearItems.join(', ')}`);
  }
  
  // Generate compliance score
  const totalItems = Object.keys(compliance).length;
  const compliantItems = Object.values(compliance).filter(value => value === 'YES').length;
  const complianceScore = Math.round((compliantItems / totalItems) * 100);
  
  console.log(`📊 Compliance Score: ${complianceScore}%`);
  
  if (alerts.length > 0) {
    console.log('🚨 Alerts:', alerts);
  } else {
    console.log('✅ No compliance alerts');
  }
  
  return {
    complianceScore,
    alerts,
    unclearItems,
    totalItems,
    compliantItems
  };
}

// Example 7: Export and reporting
export function exampleExportAndReporting(results: any[]) {
  console.log('🔄 Example 7: Export and reporting');
  
  if (results.length === 0) {
    console.log('❌ No results to export');
    return;
  }
  
  // Generate summary report
  const summary = {
    totalDocuments: results.length,
    averageConfidence: 'medium',
    totalProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
    complianceIssues: 0,
    recommendations: []
  };
  
  // Count compliance issues
  results.forEach(result => {
    Object.values(result.leaseAnalysis.complianceChecklist).forEach(value => {
      if (value === 'NO') summary.complianceIssues++;
    });
    
    if (result.leaseAnalysis.recommendations.length > 0) {
      summary.recommendations.push(...result.leaseAnalysis.recommendations);
    }
  });
  
  // Remove duplicate recommendations
  summary.recommendations = [...new Set(summary.recommendations)];
  
  console.log('📊 Summary Report:', summary);
  
  // Example: Export to different formats
  const jsonExport = JSON.stringify(results, null, 2);
  console.log('📄 JSON Export length:', jsonExport.length, 'characters');
  
  // Example: Save to file (in browser context)
  const blob = new Blob([jsonExport], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  console.log('💾 Export ready for download');
  console.log('🔗 Download URL:', url);
  
  return {
    summary,
    exportUrl: url,
    exportData: jsonExport
  };
}
