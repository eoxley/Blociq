import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { EnhancedAskAI } from '@/lib/ai/enhanced-ask-ai';
import { analyzeDocument } from '@/lib/document-analysis-orchestrator';
import { searchAllRelevantTables, isPropertyQuery, formatDatabaseResponse } from '@/lib/ai/database-search';
import { processFileWithOCR, getOCRConfig, formatOCRError } from '@/lib/ai/ocrClient';
import { analyzeLeaseDocument } from '@/lib/document-analyzers/lease-analyzer';
import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import crypto from 'crypto';

// Enhanced AI Response interface
interface AIResponse {
  answer: string;
  sources: string[];
  confidence: number;
  suggestions: string[];
  relatedQueries: string[];
  metadata: {
    processingTime: number;
    documentsProcessed: number;
    databaseRecordsSearched: number;
    aiModel: string;
    timestamp: string;
  };
}

// Query context interface
interface QueryContext {
  userId: string;
  userEmail?: string | null;
  sessionId: string;
  source: 'web' | 'mobile' | 'api';
  features: string[];
}

// Lease terms interface
interface LeaseTerms {
  propertyAddress?: string;
  tenantNames: string[];
  landlordName?: string;
  rentAmount?: number;
  securityDeposit?: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseTerm?: string;
}

// Financial analysis interface
interface FinancialAnalysis {
  monthlyRent?: number;
  totalLeaseValue?: number;
  fees: Array<{ name: string; amount: number }>;
  paymentSchedule?: string;
  lateFees?: string;
}

// Compliance analysis interface
interface ComplianceAnalysis {
  jurisdiction?: string;
  requiredDisclosures: string[];
  missingClauses: string[];
}

// Lease analysis result interface
interface LeaseAnalysisResult {
  terms: LeaseTerms;
  financial: FinancialAnalysis;
  compliance: ComplianceAnalysis;
  keyFindings: string[];
  riskFactors: string[];
  summary: string;
  confidence: number;
}

// Insight result interface
interface InsightResult {
  recommendations: string[];
  trends: string[];
  alerts: string[];
  opportunities: string[];
  risks: string[];
  nextActions: string[];
}

// AI Configuration
const AI_CONFIG = {
  model: 'gpt-4-turbo-preview'
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * MAIN WORKFLOW: Process uploaded lease and generate chat response
 */
export async function processLeaseAndGenerateResponse(
  file: File,
  userQuestion: string,
  supabase: any,
  context: QueryContext
): Promise<AIResponse> {
  const startTime = Date.now();
  console.log(`🏠 Starting complete lease analysis for: ${file.name}`);
  
  // Step 1: Extract text from PDF using enhanced OCR with individual error handling
  console.log('📄 Step 1: Extracting text from PDF...');
  let ocrResult: any;
  try {
    ocrResult = await processOCRDocument(file);
    
    if (!ocrResult.success) {
      console.error('❌ OCR failed for file:', file.name, 'Error:', ocrResult.error);
      return {
        answer: `Failed to extract text from ${file.name}. ${ocrResult.error || 'OCR processing failed'}. Please ensure the document is readable and try again with a different file format if possible.`,
        sources: [`Failed OCR: ${file.name}`],
        confidence: 0,
        suggestions: [
          'Try uploading a clearer scan of the document',
          'Ensure the document is not password protected',
          'Check that the file is not corrupted'
        ],
        relatedQueries: [
          'How can I improve document quality for OCR?',
          'What file formats work best for document analysis?',
          'Can you help with manual document review?'
        ],
        metadata: {
          processingTime: Date.now() - startTime,
          documentsProcessed: 0,
          databaseRecordsSearched: 0,
          aiModel: 'ocr-failure',
          timestamp: new Date().toISOString(),
          error: ocrResult.error
        }
      };
    }
    
    if (!ocrResult.extractedText || ocrResult.extractedText.length === 0) {
      console.error('❌ No text extracted from file:', file.name);
      return {
        answer: `No text could be extracted from ${file.name}. The document may be an image-only PDF or the text may not be machine-readable. Please try uploading a text-based PDF or a clearer scan.`,
        sources: [`Empty OCR result: ${file.name}`],
        confidence: 0,
        suggestions: [
          'Upload a text-based PDF instead of a scanned image',
          'Ensure the document scan is clear and high-resolution',
          'Try converting the document to a different format'
        ],
        relatedQueries: [
          'How to create searchable PDFs?',
          'What makes a document OCR-friendly?',
          'Can you analyze documents manually?'
        ],
        metadata: {
          processingTime: Date.now() - startTime,
          documentsProcessed: 0,
          databaseRecordsSearched: 0,
          aiModel: 'no-text-extracted',
          timestamp: new Date().toISOString(),
          error: 'No text extracted'
        }
      };
    }
  } catch (error) {
    console.error('❌ OCR processing failed with exception:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown OCR error';
    return {
      answer: `Document processing failed for ${file.name}. ${errorMessage}. Please try uploading the document again or contact support if the issue persists.`,
      sources: [`OCR error: ${file.name}`],
      confidence: 0,
      suggestions: [
        'Try uploading the document again',
        'Check your internet connection',
        'Contact support if the problem persists'
      ],
      relatedQueries: [
        'What are common document upload issues?',
        'How to troubleshoot OCR problems?',
        'Alternative ways to analyze documents?'
      ],
      metadata: {
        processingTime: Date.now() - startTime,
        documentsProcessed: 0,
        databaseRecordsSearched: 0,
        aiModel: 'ocr-exception',
        timestamp: new Date().toISOString(),
        error: errorMessage
      }
    };
  }
  
  try {
    
    console.log(`✅ Text extracted: ${ocrResult.extractedText.length} characters`);
    
    // Step 2: Analyze the lease document with individual error handling
    console.log('🔍 Step 2: Analyzing lease terms...');
    let leaseAnalysis: any;
    try {
      leaseAnalysis = await analyzeLeaseDocument(ocrResult.extractedText, file.name);
      console.log(`✅ Lease analysis completed with confidence: ${leaseAnalysis.complianceStatus}`);
    } catch (error) {
      console.error('❌ Lease analysis failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Lease analysis failed';
      return {
        answer: `Successfully extracted text from ${file.name}, but lease analysis failed. ${errorMessage}. The document text is available but detailed lease analysis could not be completed.`,
        sources: [`Partial analysis: ${file.name}`],
        confidence: 0.3,
        suggestions: [
          'Try with a different lease document format',
          'Ensure the document is a standard lease agreement',
          'Contact support for manual document review'
        ],
        relatedQueries: [
          'What lease document formats are supported?',
          'How to prepare documents for analysis?',
          'Can you help with custom lease formats?'
        ],
        metadata: {
          processingTime: Date.now() - startTime,
          documentsProcessed: 1,
          databaseRecordsSearched: 0,
          aiModel: 'lease-analysis-failed',
          timestamp: new Date().toISOString(),
          error: errorMessage
        }
      };
    }
    
    // Step 3: Search database for related information with error handling
    console.log('🗄️ Step 3: Searching database for related data...');
    let databaseResults: any;
    try {
      databaseResults = await searchRelatedLeaseData(
        supabase, 
        extractLeaseTerms(leaseAnalysis), 
        userQuestion
      );
      console.log(`✅ Database search completed: ${databaseResults.totalRecords} records found`);
    } catch (error) {
      console.error('❌ Database search failed:', error);
      // Continue with empty database results - this is not critical
      databaseResults = {
        data: [],
        tablesSearched: [],
        confidence: 0,
        totalRecords: 0,
      };
    }
    
    // Step 4: Generate comprehensive AI response
    console.log('🧠 Step 4: Generating AI response...');
    const aiResponse = await generateLeaseAnalysisResponse(
      userQuestion,
      ocrResult,
      leaseAnalysis,
      databaseResults,
      context
    );
    
    // Step 5: Generate actionable insights
    console.log('💡 Step 5: Creating insights and recommendations...');
    const insights = await generateLeaseInsights(leaseAnalysis, databaseResults);
    
    // Step 6: Format final response for chat
    const finalResponse: AIResponse = {
      answer: formatLeaseResponseForChat(aiResponse, leaseAnalysis, insights),
      sources: [
        `Document: ${file.name}`,
        ...databaseResults.tablesSearched.map((table: string) => `Database: ${table}`),
        'AI Analysis Engine'
      ],
      confidence: calculateOverallConfidence(
        { ...databaseResults, confidence: databaseResults.confidence || 0.8 },
        [{ 
          extractedData: ocrResult.extractedText,
          documentType: 'lease' as const,
          confidence: leaseAnalysis.complianceStatus === 'compliant' ? 0.9 : 0.7,
          keyFindings: leaseAnalysis.actionItems.map(item => item.description),
          actionableInsights: insights.recommendations 
        }]
      ),
      suggestions: [
        ...insights.nextActions.slice(0, 2),
        'Review lease compliance requirements',
        'Check market comparisons for this property'
      ],
      relatedQueries: [
        'What are the key dates for this lease?',
        'How does this rent compare to market rates?',
        'What maintenance responsibilities are outlined?',
        'Are there any renewal options available?'
      ],
      metadata: {
        processingTime: Date.now() - startTime,
        documentsProcessed: 1,
        databaseRecordsSearched: databaseResults.totalRecords || 0,
        aiModel: 'gpt-4-turbo-preview',
        timestamp: new Date().toISOString(),
      },
    };
    
    console.log('🎉 Complete lease analysis finished successfully!');
    return finalResponse;
    
  } catch (error) {
    console.error('❌ Unexpected error in lease processing workflow:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    return {
      answer: `An unexpected error occurred while processing ${file.name}. ${errorMessage}. Please try again or contact support if the issue persists.`,
      sources: [`Processing error: ${file.name}`],
      confidence: 0,
      suggestions: [
        'Try uploading the document again',
        'Check if the document is corrupted',
        'Contact support for assistance'
      ],
      relatedQueries: [
        'What could cause document processing to fail?',
        'How to troubleshoot upload issues?',
        'Alternative document analysis methods?'
      ],
      metadata: {
        processingTime: Date.now() - startTime,
        documentsProcessed: 0,
        databaseRecordsSearched: 0,
        aiModel: 'processing-error',
        timestamp: new Date().toISOString(),
        error: errorMessage
      }
    };
  }
}

/**
 * Process OCR document - Enhanced with local fallback system and better error handling
 */
async function processOCRDocument(file: File): Promise<{ success: boolean; extractedText?: string; metadata?: any; error?: string }> {
  try {
    console.log(`📄 Starting enhanced OCR processing for: ${file.name} (${file.size} bytes)`);
    
    // Strategy 1: Try direct PDF extraction first (fastest)
    if (file.type === 'application/pdf') {
      try {
        console.log('📄 Attempting direct PDF extraction...');
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log('📊 PDF buffer analysis:', {
          size: buffer.length,
          isPDF: buffer.slice(0, 4).toString() === '%PDF',
          firstBytes: buffer.slice(0, 20).toString('hex')
        });
        
        // Import the local text extraction service
        const { extractText } = await import('@/lib/extractTextFromPdf');
        const result = await extractText(new Uint8Array(buffer), file.name);
        
        console.log('📊 Direct PDF extraction result:', {
          success: !!result,
          textLength: result?.text?.length || 0,
          textPreview: result?.text?.substring(0, 100) || 'No text'
        });
        
        if (result?.text && result.text.length > 50) {
          console.log(`✅ Direct PDF extraction successful: ${result.text.length} characters`);
          return {
            success: true,
            extractedText: result.text,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              method: 'pdf-parser',
              confidence: 'high',
              processingTime: 0
            }
          };
        }
        
        console.log('⚠️ Direct PDF extraction yielded insufficient text, trying OCR fallbacks...');
      } catch (pdfError) {
        console.log('⚠️ Direct PDF extraction failed, trying OCR fallbacks...', pdfError);
      }
    }
    
    // Strategy 2: Try OCR fallback system with OpenAI Vision
    try {
      console.log('🔄 Using OCR fallback system with OpenAI Vision...');
      const { processDocumentWithFallback } = await import('@/lib/ocr-fallback');
      const fallbackResult = await processDocumentWithFallback(file);
      
      if (fallbackResult.text && fallbackResult.text.length > 50) {
        console.log(`✅ Fallback OCR successful: ${fallbackResult.text.length} characters via ${fallbackResult.method}`);
        return {
          success: true,
          extractedText: fallbackResult.text,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            method: fallbackResult.method,
            confidence: fallbackResult.quality || 'medium',
            attempts: fallbackResult.attempts,
            fallbackReasons: fallbackResult.fallbackReasons
          }
        };
      }
      
      console.log('⚠️ Fallback OCR yielded insufficient text, trying external service...');
    } catch (fallbackError) {
      console.log('⚠️ Fallback OCR failed, trying external service...', fallbackError);
    }
    
    // Strategy 3: Try external OCR service as last resort
    try {
      console.log('🌐 Attempting external OCR service...');
      const ocrConfig = getOCRConfig();
      const result = await processFileWithOCR(file, ocrConfig);
      
      if (result.success && result.text && result.text.length > 50) {
        console.log(`✅ External OCR successful: ${result.text.length} characters`);
        return {
          success: true,
          extractedText: result.text,
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            method: 'external-ocr',
            confidence: result.confidence || 'medium',
            processingTime: result.metadata?.processingTime
          }
        };
      }
      
      // External service returned success but no meaningful text
      if (result.success && (!result.text || result.text.length <= 50)) {
        console.log('⚠️ External OCR returned success but insufficient text');
        return {
          success: false,
          error: 'OCR processing completed but extracted text is too short or empty. This may indicate the document is an image-only PDF or has very poor quality.'
        };
      }
      
      // External service failed
      return {
        success: false,
        error: result.error || 'External OCR service failed'
      };
      
    } catch (externalError) {
      console.error('❌ External OCR service failed:', externalError);
      return {
        success: false,
        error: 'All OCR strategies failed. The document may be corrupted, password-protected, or in an unsupported format.'
      };
    }
    
  } catch (error) {
    console.error('❌ OCR processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OCR processing error'
    };
  }
}

/**
 * Extract lease terms from analysis result
 */
function extractLeaseTerms(leaseAnalysis: any): LeaseTerms {
  return {
    propertyAddress: leaseAnalysis.detailedAnalysis?.propertyDetails?.address,
    tenantNames: leaseAnalysis.detailedAnalysis?.propertyDetails?.tenant ? [leaseAnalysis.detailedAnalysis.propertyDetails.tenant] : [],
    landlordName: leaseAnalysis.detailedAnalysis?.propertyDetails?.landlord,
    rentAmount: leaseAnalysis.detailedAnalysis?.financialObligations?.monthlyRent ? parseFloat(leaseAnalysis.detailedAnalysis.financialObligations.monthlyRent.replace(/[^\d.]/g, '')) : undefined,
    securityDeposit: leaseAnalysis.detailedAnalysis?.financialObligations?.securityDeposit ? parseFloat(leaseAnalysis.detailedAnalysis.financialObligations.securityDeposit.replace(/[^\d.]/g, '')) : undefined,
    leaseStartDate: leaseAnalysis.detailedAnalysis?.propertyDetails?.startDate,
    leaseEndDate: leaseAnalysis.detailedAnalysis?.propertyDetails?.endDate,
    leaseTerm: leaseAnalysis.detailedAnalysis?.propertyDetails?.leaseTerm
  };
}

/**
 * Search database for lease-related information
 */
async function searchRelatedLeaseData(
  supabase: any,
  leaseTerms: LeaseTerms,
  userQuestion: string
): Promise<any> {
  const searchQueries = [];
  
  // Search by property address
  if (leaseTerms.propertyAddress) {
    searchQueries.push(
      supabase
        .from('properties')
        .select('*')
        .ilike('address', `%${leaseTerms.propertyAddress}%`)
    );
  }
  
  // Search by tenant names
  if (leaseTerms.tenantNames.length > 0) {
    const tenantSearches = leaseTerms.tenantNames.map(name =>
      supabase
        .from('tenants')
        .select('*')
        .ilike('name', `%${name}%`)
    );
    searchQueries.push(...tenantSearches);
  }
  
  // Search by rent amount (find similar properties)
  if (leaseTerms.rentAmount) {
    const rentRange = leaseTerms.rentAmount * 0.2; // 20% range
    searchQueries.push(
      supabase
        .from('vw_units_leaseholders')
        .select('*')
        .gte('monthly_rent', leaseTerms.rentAmount - rentRange)
        .lte('monthly_rent', leaseTerms.rentAmount + rentRange)
        .limit(10)
    );
  }
  
  try {
    const results = await Promise.allSettled(searchQueries);
    const successfulResults = results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value.data || [])
      .flat();
    
    return {
      data: successfulResults,
      tablesSearched: ['properties', 'tenants', 'vw_units_leaseholders'],
      confidence: successfulResults.length > 0 ? 0.8 : 0.3,
      totalRecords: successfulResults.length,
    };
  } catch (error) {
    console.error('Database search error:', error);
    return {
      data: [],
      tablesSearched: [],
      confidence: 0,
      totalRecords: 0,
    };
  }
}

/**
 * Generate comprehensive AI response for lease analysis
 */
async function generateLeaseAnalysisResponse(
  userQuestion: string,
  ocrResult: any,
  leaseAnalysis: any,
  databaseResults: any,
  context: QueryContext
): Promise<string> {
  const leaseTerms = extractLeaseTerms(leaseAnalysis);
  
  const prompt = `You are BlocIQ AI, an expert property management assistant. A user has uploaded a lease document and asked: "${userQuestion}"

EXTRACTED LEASE DATA:
📄 Document: ${ocrResult.metadata.fileName}
📊 Text Length: ${ocrResult.extractedText.length} characters
🎯 Compliance Status: ${leaseAnalysis.complianceStatus}

LEASE TERMS EXTRACTED:
• Property: ${leaseTerms.propertyAddress || 'Not specified'}
• Tenant(s): ${leaseTerms.tenantNames.join(', ') || 'Not specified'}
• Landlord: ${leaseTerms.landlordName || 'Not specified'}
• Monthly Rent: ${leaseTerms.rentAmount ? `£${leaseTerms.rentAmount.toLocaleString()}` : 'Not specified'}
• Security Deposit: ${leaseTerms.securityDeposit ? `£${leaseTerms.securityDeposit.toLocaleString()}` : 'Not specified'}
• Lease Term: ${leaseTerms.leaseStartDate} to ${leaseTerms.leaseEndDate}
• Duration: ${leaseTerms.leaseTerm || 'Not specified'}

KEY FINDINGS:
${leaseAnalysis.actionItems.map((item: any) => `• ${item.description} (Priority: ${item.priority})`).join('\n')}

RISK ASSESSMENT:
• Overall Risk: ${leaseAnalysis.riskAssessment.overall}
• Risk Factors: ${leaseAnalysis.riskAssessment.factors.join(', ')}

COMPLIANCE STATUS: ${leaseAnalysis.complianceStatus}

DATABASE SEARCH RESULTS:
Found ${databaseResults.totalRecords} related records in your system.

DOCUMENT SUMMARY:
${leaseAnalysis.summary}

Please provide a comprehensive, actionable response that:
1. Directly answers the user's question
2. Highlights the most important lease details
3. Provides actionable recommendations
4. Notes any concerns or opportunities
5. Suggests next steps

Keep the tone professional but conversational, like you're briefing a property manager.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.2,
    });

    return completion.choices[0]?.message?.content || 'Unable to generate lease analysis response.';
  } catch (error) {
    console.error('AI response generation error:', error);
    return `I've successfully extracted and analyzed your lease document "${ocrResult.metadata.fileName}". 

Here's what I found:

**Property:** ${leaseTerms.propertyAddress || 'Address not clearly specified'}
**Tenant:** ${leaseTerms.tenantNames.join(', ') || 'Tenant name not found'}
**Monthly Rent:** ${leaseTerms.rentAmount ? `£${leaseTerms.rentAmount.toLocaleString()}` : 'Amount not specified'}
**Lease Period:** ${leaseTerms.leaseStartDate || 'Start date unclear'} to ${leaseTerms.leaseEndDate || 'End date unclear'}

${leaseAnalysis.actionItems.length > 0 ? `\n**Key Points:**\n${leaseAnalysis.actionItems.map((item: any) => `• ${item.description}`).join('\n')}` : ''}

${leaseAnalysis.riskAssessment.factors.length > 0 ? `\n**Important Notes:**\n${leaseAnalysis.riskAssessment.factors.map((r: string) => `⚠️ ${r}`).join('\n')}` : ''}

The document has been processed with ${leaseAnalysis.complianceStatus} compliance status. Let me know if you need me to focus on any specific aspect of this lease!`;
  }
}

/**
 * Format the final response for chat display
 */
function formatLeaseResponseForChat(
  aiResponse: string,
  leaseAnalysis: any,
  insights: InsightResult
): string {
  const leaseTerms = extractLeaseTerms(leaseAnalysis);
  
  // Extract the main AI response and enhance it with structured data
  let response = aiResponse;
  
  // Add extracted data summary if AI response is too generic
  if (response.length < 200) {
    response = `## 📋 Lease Analysis Complete

${response}

### 🏠 **Property Details**
- **Address:** ${leaseTerms.propertyAddress || 'Not specified'}
- **Monthly Rent:** ${leaseTerms.rentAmount ? `£${leaseTerms.rentAmount.toLocaleString()}` : 'Not found'}
- **Security Deposit:** ${leaseTerms.securityDeposit ? `£${leaseTerms.securityDeposit.toLocaleString()}` : 'Not specified'}

### 📅 **Important Dates**
- **Lease Start:** ${leaseTerms.leaseStartDate || 'Not found'}
- **Lease End:** ${leaseTerms.leaseEndDate || 'Not found'}
- **Term Length:** ${leaseTerms.leaseTerm || 'Not specified'}

${leaseAnalysis.keyDates.length > 0 ? `### ✅ **Key Dates**\n${leaseAnalysis.keyDates.map((d: any) => `- ${d.description}: ${d.date}`).join('\n')}\n` : ''}

${leaseAnalysis.actionItems.length > 0 ? `### ⚠️ **Action Items**\n${leaseAnalysis.actionItems.map((item: any) => `- ${item.description} (${item.priority} priority)`).join('\n')}\n` : ''}

${insights.recommendations.length > 0 ? `### 💡 **Recommendations**\n${insights.recommendations.map(r => `- ${r}`).join('\n')}\n` : ''}
`;
  }
  
  return response;
}

/**
 * Generate lease-specific insights
 */
async function generateLeaseInsights(
  leaseAnalysis: any,
  databaseResults: any
): Promise<InsightResult> {
  const recommendations: string[] = [];
  const nextActions: string[] = [];
  const alerts: string[] = [];
  const opportunities: string[] = [];
  
  const leaseTerms = extractLeaseTerms(leaseAnalysis);
  
  // Rent analysis
  if (leaseTerms.rentAmount && databaseResults.data.length > 0) {
    const similarRents = databaseResults.data
      .filter((item: any) => item.monthly_rent)
      .map((item: any) => item.monthly_rent);
    
    if (similarRents.length > 0) {
      const avgMarketRent = similarRents.reduce((sum: number, rent: number) => sum + rent, 0) / similarRents.length;
      const rentDiff = leaseTerms.rentAmount - avgMarketRent;
      const diffPercentage = (rentDiff / avgMarketRent) * 100;
      
      if (Math.abs(diffPercentage) > 10) {
        recommendations.push(
          `Current rent is ${diffPercentage > 0 ? 'above' : 'below'} market average by ${Math.abs(diffPercentage).toFixed(1)}%`
        );
      }
    }
  }
  
  // Date analysis
  if (leaseTerms.leaseEndDate) {
    const endDate = new Date(leaseTerms.leaseEndDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 60 && daysUntilExpiry > 0) {
      alerts.push(`Lease expires in ${daysUntilExpiry} days - consider renewal planning`);
      nextActions.push('Initiate lease renewal discussions');
    } else if (daysUntilExpiry < 0) {
      alerts.push(`Lease expired ${Math.abs(daysUntilExpiry)} days ago`);
      nextActions.push('Address expired lease status immediately');
    }
  }
  
  // Compliance analysis
  if (leaseAnalysis.complianceStatus === 'non_compliant') {
    recommendations.push('Review lease compliance requirements - multiple issues identified');
    nextActions.push('Prioritize compliance updates and legal review');
  } else if (leaseAnalysis.complianceStatus === 'requires_review') {
    recommendations.push('Schedule compliance review to address identified gaps');
    nextActions.push('Update lease template with missing clauses');
  }
  
  // High priority action items
  const highPriorityActions = leaseAnalysis.actionItems.filter((item: any) => item.priority === 'high');
  if (highPriorityActions.length > 0) {
    opportunities.push(`${highPriorityActions.length} high-priority items need immediate attention`);
    nextActions.push('Address high-priority compliance gaps first');
  }
  
  return {
    recommendations,
    trends: [], // Could be enhanced with historical data
    alerts,
    opportunities,
    risks: leaseAnalysis.riskAssessment.factors,
    nextActions,
  };
}

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(
  databaseResults: any,
  documentAnalyses: any[]
): number {
  const dbConfidence = databaseResults.confidence || 0.5;
  const docConfidences = documentAnalyses.map(doc => doc.confidence || 0.7);
  const avgDocConfidence = docConfidences.length > 0 ? 
    docConfidences.reduce((sum, conf) => sum + conf, 0) / docConfidences.length : 0.5;
  
  // Weighted average: 30% database, 70% document analysis
  return Math.round((dbConfidence * 0.3 + avgDocConfidence * 0.7) * 100) / 100;
}


/**
 * EMERGENCY FIX: Simplified enhanced route with direct database access
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const formData = await request.formData();
    
    // ✅ NEW - WORKS WITH YOUR FRONTEND
    const userQuestion = (formData.get('prompt') as string) || 
                        (formData.get('userQuestion') as string) || 
                        (formData.get('question') as string);
    
    console.log(`🔍 Query received: "${userQuestion}"`);
    
    if (!userQuestion) {
      console.error('❌ NO QUERY FOUND');
      console.error('Available fields:', Array.from(formData.keys()));
      return NextResponse.json({ error: 'No query provided' }, { status: 400 });
    }
    
    // ✅ FORCE DATABASE SEARCH FOR PROPERTY QUERIES
    let databaseResults = { data: [], totalRecords: 0 };
    
    // Check if it's a property query using the proper function
    const isPropertyQueryResult = isPropertyQuery(userQuestion);
    
    console.log(`🏠 Property query detection:`, {
      query: userQuestion,
      isPropertyQuery: isPropertyQueryResult,
      queryLower: userQuestion.toLowerCase()
    });
    
    if (isPropertyQueryResult) {
      console.log('🗄️ SEARCHING DATABASE WITH PROPER FUNCTION...');
      
      try {
        // Use the proper database search function we created
        const databaseResponse = await searchAllRelevantTables(supabase, userQuestion);
        
        console.log('📊 Database search response:', databaseResponse);
        console.log('📊 Response type:', typeof databaseResponse);
        console.log('📊 Response keys:', Object.keys(databaseResponse || {}));
        
        // Check if we got any data from the search
        if (databaseResponse && Object.keys(databaseResponse).length > 0) {
          // Check if we have leaseholder data
          if (databaseResponse.leaseholders && databaseResponse.leaseholders.length > 0) {
            console.log('✅ DATABASE SEARCH SUCCESSFUL! Found leaseholders:', databaseResponse.leaseholders.length);
            
            // Format the database response properly
            const formattedResponse = formatDatabaseResponse(databaseResponse, userQuestion);
            databaseResults.data = [{ response: formattedResponse }];
            databaseResults.totalRecords = 1;
            
            console.log(`✅ DATABASE FOUND DATA: ${formattedResponse.substring(0, 100)}...`);
          } else if (databaseResponse.buildings && databaseResponse.buildings.length > 0) {
            console.log('✅ DATABASE SEARCH SUCCESSFUL! Found buildings:', databaseResponse.buildings.length);
            
            // Format the database response properly
            const formattedResponse = formatDatabaseResponse(databaseResponse, userQuestion);
            databaseResults.data = [{ response: formattedResponse }];
            databaseResults.totalRecords = 1;
            
            console.log(`✅ DATABASE FOUND DATA: ${formattedResponse.substring(0, 100)}...`);
          } else {
            console.log('❌ Database search returned empty results');
          }
        } else {
          console.log('❌ No database data found');
        }
      } catch (error) {
        console.error('❌ Database search error:', error);
      }
    } else {
      console.log('❌ Query NOT detected as property query - will use AI response');
    }
    
    // Generate response WITH DATABASE DATA
    let answer = '';
    
    if (databaseResults.totalRecords > 0 && databaseResults.data[0]?.response) {
      // USE THE REAL DATABASE RESPONSE
      answer = databaseResults.data[0].response;
      console.log('✅ Using real database response:', answer.substring(0, 200));
      
    } else {
      answer = `I searched for "${userQuestion}" in your property database but didn't find any records. 

This could mean:
• The property isn't in your system yet
• It might be listed under a different name
• The address format might be different

Would you like me to search for similar properties or help you add this property to your database?`;
    }
    
    return NextResponse.json({
      success: true,
      answer,
      confidence: databaseResults.totalRecords > 0 ? 90 : 30,
      sources: databaseResults.totalRecords > 0 ? ['vw_units_leaseholders'] : [],
      metadata: {
        processingTime: 0,
        databaseRecordsSearched: databaseResults.totalRecords, // This should be > 0 now!
        documentsProcessed: 0,
        aiModel: "gpt-4-turbo-preview",
        timestamp: new Date().toISOString()
      },
      relatedQueries: [
        "Show me all properties on Ashwood",
        "What other units are available?", 
        "Who are the current tenants?"
      ],
      suggestions: [
        "Search for other properties in this area",
        "View full property portfolio",
        "Check lease renewal dates"
      ]
    });
    
  } catch (error) {
    console.error('Enhanced route error:', error);
    return NextResponse.json({ error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

/**
 * Log lease processing for analytics
 */
async function logLeaseProcessing(
  supabase: any,
  context: QueryContext,
  file: File,
  response: AIResponse
): Promise<void> {
  try {
    await supabase.from('lease_processing_logs').insert({
      user_id: context.userId,
      session_id: context.sessionId,
      file_name: file.name,
      file_size: file.size,
      text_length: response.metadata.documentsProcessed,
      confidence: response.confidence,
      processing_time_ms: response.metadata.processingTime,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Lease processing log error:', error);
    // Don't fail the request if logging fails
  }
}

/**
 * ✅ FIX: Enhanced property query detection
 */
function checkIfPropertyQuery(query: string): boolean {
  if (!query || query.trim().length === 0) {
    console.warn('⚠️ Empty query provided to property detection');
    return false;
  }

  const lowerQuery = query.toLowerCase();
  console.log(`🔍 Analyzing query for property intent: "${query}"`);
  
  // Property-related keywords
  const propertyKeywords = [
    'property', 'unit', 'apartment', 'house', 'building',
    'leaseholder', 'tenant', 'resident', 'occupant',
    'rent', 'lease', 'rental', 'address',
    'who lives', 'who is in', 'who rents', 'occupancy'
  ];
  
  // Address patterns
  const addressPattern = /\b\d+\s+[A-Za-z\s]+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|house|court|ct)\b/i;
  const hasAddress = addressPattern.test(query);
  
  // Check for property keywords
  const hasPropertyKeywords = propertyKeywords.some(keyword => lowerQuery.includes(keyword));
  
  const isProperty = hasAddress || hasPropertyKeywords;
  console.log(`🏠 Property query result: ${isProperty} (address: ${hasAddress}, keywords: ${hasPropertyKeywords})`);
  
  return isProperty;
}

/**
 * ✅ FIX: Direct leaseholder search for property queries
 */
async function searchLeaseholders(supabase: any, query: string): Promise<any[]> {
  console.log(`🔍 Searching leaseholders for: "${query}"`);
  
  try {
    // Extract potential address or property identifier
    const searchTerms = extractSearchTerms(query);
    console.log(`🔎 Search terms extracted: ${searchTerms.join(', ')}`);
    
    if (searchTerms.length === 0) {
      console.warn('⚠️ No search terms found in query');
      return [];
    }
    
    // Build search conditions - using the actual column names from vw_units_leaseholders
    const searchConditions = searchTerms.map(term => [
      `building_name.ilike.%${term}%`,
      `unit_address.ilike.%${term}%`, 
      `unit_number.ilike.%${term}%`,
      `leaseholder_name.ilike.%${term}%`,
      `full_name.ilike.%${term}%`
    ]).flat();
    
    const { data, error } = await supabase
      .from('vw_units_leaseholders')
      .select('*')
      .or(searchConditions.join(','))
      .limit(50);

    if (error) {
      console.error('❌ Leaseholder search error:', error);
      return [];
    }

    console.log(`✅ Leaseholder search found ${data?.length || 0} results`);
    return data || [];
  } catch (error) {
    console.error('❌ Leaseholder search failed:', error);
    return [];
  }
}

/**
 * Extract search terms from user query
 */
function extractSearchTerms(query: string): string[] {
  const terms: string[] = [];
  
  // Extract numbers (could be unit numbers or addresses)
  const numbers = query.match(/\b\d+\b/g) || [];
  terms.push(...numbers);
  
  // Extract property names (capitalize words)
  const propertyNames = query.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:House|Court|Building|Apartments?|Complex)\b/g) || [];
  terms.push(...propertyNames);
  
  // Extract street names
  const streetPattern = /\b\d+\s+([A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln))\b/gi;
  const streetMatches = query.match(streetPattern) || [];
  terms.push(...streetMatches);
  
  // Extract individual words that might be property identifiers
  const words = query.split(/\s+/).filter(word => 
    word.length > 2 && 
    !/^(who|is|the|of|in|at|for|and|or|but)$/i.test(word)
  );
  terms.push(...words);
  
  return [...new Set(terms)]; // Remove duplicates
}

/**
 * Format response for leaseholder queries
 */
function formatLeaseholderResponse(query: string, leaseholderData: any[]): string {
  if (leaseholderData.length === 1) {
    const record = leaseholderData[0];
    return `## 🏠 Property Information Found

**Property:** ${record.building_name || 'Unknown Property'}
**Address:** ${record.unit_address || 'Address not available'}
**Unit:** ${record.unit_number || 'N/A'}

**Current Leaseholder:** ${record.leaseholder_name || record.full_name || 'No current tenant'}

${record.monthly_rent ? `**Monthly Rent:** £${record.monthly_rent.toLocaleString()}` : ''}
${record.lease_start_date ? `**Lease Start:** ${record.lease_start_date}` : ''}
${record.lease_end_date ? `**Lease End:** ${record.lease_end_date}` : ''}
${record.lease_status ? `**Status:** ${record.lease_status}` : ''}

${record.phone || record.email ? '**Contact Info:**' : ''}
${record.phone ? `• Phone: ${record.phone}` : ''}
${record.email ? `• Email: ${record.email}` : ''}`;
  } else {
    return `## 🏠 Multiple Properties Found (${leaseholderData.length} results)

${leaseholderData.map((record, i) => `
**${i + 1}. ${record.building_name || 'Property'} ${record.unit_number ? `- Unit ${record.unit_number}` : ''}**
• Leaseholder: ${record.leaseholder_name || record.full_name || 'Vacant'}
• Address: ${record.unit_address || 'Not available'}
${record.monthly_rent ? `• Rent: £${record.monthly_rent.toLocaleString()}` : ''}
`).join('')}`;
  }
}

export async function GET() {
  try {
    const { supabase, user } = await requireAuth();

    // Return knowledge base statistics for admin users
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') {
      const enhancedAI = new EnhancedAskAI();
      const stats = await enhancedAI.getKnowledgeStats();
      const categories = await enhancedAI.getKnowledgeCategories();

      return NextResponse.json({
        stats,
        categories,
        message: 'Enhanced Ask AI endpoint is active with comprehensive lease processing workflow'
      });
    }

    return NextResponse.json({
      message: 'Enhanced Ask AI endpoint is active with comprehensive lease processing workflow'
    });

  } catch (error) {
    console.error('Failed to get Enhanced Ask AI info:', error);
    
    return NextResponse.json({ 
      error: 'Failed to retrieve information'
    }, { status: 500 });
  }
}