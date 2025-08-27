/**
 * Document Analysis Integration Example for BlocIQ
 * Shows how to integrate the complete document analysis system with useAIConversation
 */

import { processDocumentOCR } from './ocr';
import { analyzeDocument } from './document-analysis-orchestrator';
import { DocumentType } from './document-classifier';

export interface DocumentAnalysisResult {
  filename: string;
  documentType: DocumentType;
  ocrResult: {
    text: string;
    confidence?: number;
    processingTime?: number;
  };
  analysis: {
    summary: string;
    complianceStatus: string;
    keyDates: {
      issueDate?: string | null;
      expiryDate?: string | null;
      nextReviewDate?: string | null;
      deadlines?: string[];
      [key: string]: string | Date | null | string[] | undefined;
    };
    actionItems: {
      immediate?: string[];
      shortTerm?: string[];
      longTerm?: string[];
      [key: string]: string[] | undefined;
    };
    riskAssessment: {
      overall: 'unknown' | 'low' | 'medium' | 'high' | 'critical';
      factors?: string[];
      mitigation?: string[];
      details?: string[];
    };
    recommendations: string[];
  };
  aiPrompt: string;
  processingTime: number;
}

/**
 * Complete document processing pipeline
 * @param file - Document file to process
 * @param userMessage - Original user message for context
 * @returns Promise<DocumentAnalysisResult> - Complete analysis result
 */
export async function processDocumentComplete(
  file: File, 
  userMessage: string
): Promise<DocumentAnalysisResult> {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Starting complete document processing for: ${file.name}`);
    
    // Step 1: OCR Processing
    console.log('📄 Step 1: Processing document through OCR...');
    const ocrResult = await processDocumentOCR(file, {
      enhanceText: true,
      extractTables: true
    });
    
    if (!ocrResult.text || ocrResult.error) {
      throw new Error(`OCR processing failed: ${ocrResult.error || 'No text extracted'}`);
    }
    
    console.log(`✅ OCR completed: ${ocrResult.text.length} characters extracted`);
    
    // Step 2: Document Classification and Analysis
    console.log('🔍 Step 2: Analyzing document content...');
    const analysis = await analyzeDocument(ocrResult.text, file.name, userMessage);
    
    console.log(`✅ Document analysis completed: ${analysis.documentType} document`);
    
    const totalProcessingTime = Date.now() - startTime;
    
    return {
      filename: file.name,
      documentType: analysis.documentType,
      ocrResult: {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        processingTime: ocrResult.processingTime
      },
      analysis: {
        summary: analysis.summary,
        complianceStatus: analysis.complianceStatus,
        keyDates: analysis.keyDates,
        actionItems: analysis.actionItems,
        riskAssessment: analysis.riskAssessment,
        recommendations: analysis.recommendations
      },
      aiPrompt: analysis.aiPrompt,
      processingTime: totalProcessingTime
    };
    
  } catch (error) {
    console.error(`❌ Document processing failed for ${file.name}:`, error);
    throw error;
  }
}

/**
 * Batch process multiple documents
 * @param files - Array of document files
 * @param userMessage - Original user message for context
 * @returns Promise<DocumentAnalysisResult[]> - Array of analysis results
 */
export async function processMultipleDocumentsComplete(
  files: File[], 
  userMessage: string
): Promise<DocumentAnalysisResult[]> {
  console.log(`🚀 Starting batch processing for ${files.length} documents`);
  
  const results: DocumentAnalysisResult[] = [];
  
  for (const file of files) {
    try {
      const result = await processDocumentComplete(file, userMessage);
      results.push(result);
      console.log(`✅ Successfully processed: ${file.name}`);
    } catch (error) {
      console.error(`❌ Failed to process ${file.name}:`, error);
      
      // Add error result
      results.push({
        filename: file.name,
        documentType: 'other',
        ocrResult: {
          text: '',
          processingTime: 0
        },
        analysis: {
          summary: `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          complianceStatus: 'unknown',
          keyDates: {},
          actionItems: {},
          riskAssessment: { overall: 'unknown', factors: [], mitigation: [] },
          recommendations: ['Document processing failed - please try again']
        },
        aiPrompt: `Failed to process ${file.name}`,
        processingTime: 0
      });
    }
  }
  
  // Generate summary statistics
  const successful = results.filter(r => r.analysis.complianceStatus !== 'unknown').length;
  const failed = results.filter(r => r.analysis.complianceStatus === 'unknown').length;
  const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);
  
  console.log(`📊 Batch processing complete:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏱️ Total processing time: ${totalProcessingTime}ms`);
  
  return results;
}

/**
 * Generate portfolio summary from multiple document analyses
 * @param results - Array of document analysis results
 * @returns Object with portfolio statistics and insights
 */
export function generatePortfolioSummary(results: DocumentAnalysisResult[]) {
  const successfulResults = results.filter(r => r.analysis.complianceStatus !== 'unknown');
  
  if (successfulResults.length === 0) {
    return {
      totalDocuments: 0,
      documentTypes: {},
      complianceOverview: {},
      riskSummary: {},
      actionItems: {},
      recommendations: []
    };
  }
  
  // Document type distribution
  const documentTypes: Record<string, number> = {};
  successfulResults.forEach(result => {
    documentTypes[result.documentType] = (documentTypes[result.documentType] || 0) + 1;
  });
  
  // Compliance overview
  const complianceOverview = {
    compliant: successfulResults.filter(r => r.analysis.complianceStatus === 'compliant').length,
    partiallyCompliant: successfulResults.filter(r => r.analysis.complianceStatus === 'partially-compliant').length,
    nonCompliant: successfulResults.filter(r => r.analysis.complianceStatus === 'non-compliant').length,
    unknown: successfulResults.filter(r => r.analysis.complianceStatus === 'unknown').length
  };
  
  // Risk summary
  const riskSummary = {
    low: successfulResults.filter(r => r.analysis.riskAssessment.overall === 'low').length,
    medium: successfulResults.filter(r => r.analysis.riskAssessment.overall === 'medium').length,
    high: successfulResults.filter(r => r.analysis.riskAssessment.overall === 'high').length,
    critical: successfulResults.filter(r => r.analysis.riskAssessment.overall === 'critical').length,
    unknown: successfulResults.filter(r => r.analysis.riskAssessment.overall === 'unknown').length
  };
  
  // Consolidated action items
  const actionItems = {
    immediate: [...new Set(successfulResults.flatMap(r => r.analysis.actionItems.immediate || []))],
    shortTerm: [...new Set(successfulResults.flatMap(r => r.analysis.actionItems.shortTerm || []))],
    longTerm: [...new Set(successfulResults.flatMap(r => r.analysis.actionItems.longTerm || []))]
  };
  
  // Top recommendations
  const allRecommendations = successfulResults.flatMap(r => r.analysis.recommendations || []);
  const recommendationCounts: Record<string, number> = {};
  allRecommendations.forEach(rec => {
    recommendationCounts[rec] = (recommendationCounts[rec] || 0) + 1;
  });
  
  const topRecommendations = Object.entries(recommendationCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([rec, count]) => `${rec} (${count} documents)`);
  
  return {
    totalDocuments: results.length,
    successfulDocuments: successfulResults.length,
    documentTypes,
    complianceOverview,
    riskSummary,
    actionItems,
    recommendations: topRecommendations
  };
}

// Example: How to integrate with useAIConversation hook
// 
// In your component:
// 
// ```typescript
// import { useAIConversation } from '@/hooks/useAIConversation';
// import { processDocumentComplete } from '@/lib/document-analysis-integration-example';
// 
// export function DocumentAnalysisComponent() {
//   const { sendMessage, isProcessingOCR } = useAIConversation();
//   
//   const handleDocumentUpload = async (files: File[]) => {
//     try {
//       // Process documents through the analysis system
//       const results = await Promise.all(
//         files.map(file => processDocumentComplete(file, "Analyze these documents"))
//       );
//       
//       // Generate portfolio summary
//       const summary = generatePortfolioSummary(results);
//       
//       // Send to AI with enhanced context
//       const enhancedMessage = `Please analyze these documents and provide insights:
//         
//         Portfolio Summary:
//         - Total Documents: ${summary.totalDocuments}
//         - Compliance Status: ${summary.complianceOverview.compliant} compliant, ${summary.complianceOverview.nonCompliant} non-compliant
//         - Risk Level: ${summary.riskSummary.high + summary.riskSummary.critical} high/critical risk documents
//         
//         Key Action Items:
//         - Immediate: ${summary.actionItems.immediate.slice(0, 3).join(', ')}
//         - Short Term: ${summary.actionItems.shortTerm.slice(0, 3).join(', ')}
//         
//         Please provide specific recommendations for improving compliance and reducing risk.`;
//       
//       await sendMessage(enhancedMessage, files);
//       
//     } catch (error) {
//       console.error('Document analysis failed:', error);
//     }
//   };
//   
//   return (
//     <div>
//       {/* Your document upload UI */}
//     </div>
//   );
// }
// ```

/**
 * Example: Enhanced AI prompts for different document types
 */
export function generateEnhancedAIPrompts(
  analysis: DocumentAnalysisResult,
  userMessage: string
): string {
  const basePrompt = `Document Analysis: ${analysis.filename}
Type: ${analysis.documentType}
Compliance Status: ${analysis.analysis.complianceStatus}
Risk Level: ${analysis.analysis.riskAssessment.overall}

Summary: ${analysis.analysis.summary}

Key Dates: ${JSON.stringify(analysis.analysis.keyDates, null, 2)}
Action Items: ${JSON.stringify(analysis.analysis.actionItems, null, 2)}
Recommendations: ${analysis.analysis.recommendations.join(', ')}

User Question: ${userMessage}

Please provide specific, actionable advice based on this document analysis. Focus on:
1. Compliance improvements needed
2. Risk mitigation strategies
3. Priority actions and timelines
4. Legal and regulatory considerations
5. Cost implications and budgeting`;

  // Add document-specific prompts
  switch (analysis.documentType) {
    case 'eicr':
      return `${basePrompt}

Electrical Safety Focus:
- Identify immediate safety concerns
- Recommend remedial action priorities
- Suggest maintenance schedules
- Highlight compliance requirements`;

    case 'gas-safety':
      return `${basePrompt}

Gas Safety Focus:
- Assess appliance safety status
- Identify maintenance requirements
- Recommend inspection schedules
- Highlight safety protocols`;

    case 'fire-risk-assessment':
      return `${basePrompt}

Fire Safety Focus:
- Evaluate risk levels and priorities
- Recommend safety improvements
- Suggest evacuation procedures
- Highlight compliance requirements`;

    case 'lease':
      return `${basePrompt}

Lease Analysis Focus:
- Identify key terms and obligations
- Highlight compliance requirements
- Suggest risk mitigation strategies
- Recommend legal review needs`;

    case 'major-works':
      return `${basePrompt}

Major Works Focus:
- Assess project scope and complexity
- Identify statutory requirements
- Recommend consultation processes
- Highlight cost implications`;

    case 'section20':
      return `${basePrompt}

Section 20 Focus:
- Assess consultation compliance
- Identify leaseholder rights
- Recommend response strategies
- Highlight statutory deadlines`;

    default:
      return basePrompt;
  }
}

/**
 * Example: Compliance monitoring dashboard data
 */
export function generateComplianceDashboardData(results: DocumentAnalysisResult[]) {
  const successfulResults = results.filter(r => r.analysis.complianceStatus !== 'unknown');
  
  // Compliance by document type
  const complianceByType: Record<string, { compliant: number; nonCompliant: number; total: number }> = {};
  
  successfulResults.forEach(result => {
    if (!complianceByType[result.documentType]) {
      complianceByType[result.documentType] = { compliant: 0, nonCompliant: 0, total: 0 };
    }
    
    complianceByType[result.documentType].total++;
    if (result.analysis.complianceStatus === 'compliant') {
      complianceByType[result.documentType].compliant++;
    } else if (result.analysis.complianceStatus === 'non-compliant') {
      complianceByType[result.documentType].nonCompliant++;
    }
  });
  
  // Risk distribution
  const riskDistribution = {
    low: successfulResults.filter(r => r.analysis.riskAssessment.overall === 'low').length,
    medium: successfulResults.filter(r => r.analysis.riskAssessment.overall === 'medium').length,
    high: successfulResults.filter(r => r.analysis.riskAssessment.overall === 'high').length,
    critical: successfulResults.filter(r => r.analysis.riskAssessment.overall === 'critical').length
  };
  
  // Upcoming deadlines
  const upcomingDeadlines = successfulResults
    .flatMap(r => {
      const dates = r.analysis.keyDates;
      return [
        { document: r.filename, type: r.documentType, date: dates.nextReviewDate, description: 'Next Review' },
        { document: r.filename, type: r.documentType, date: dates.expiryDate, description: 'Expiry Date' }
      ].filter(item => item.date && item.date !== null);
    })
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    })
    .slice(0, 10);
  
  return {
    complianceByType,
    riskDistribution,
    upcomingDeadlines,
    totalDocuments: results.length,
    overallComplianceRate: (successfulResults.filter(r => r.analysis.complianceStatus === 'compliant').length / successfulResults.length) * 100
  };
}
