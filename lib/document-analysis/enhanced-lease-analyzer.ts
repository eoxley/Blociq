// lib/document-analysis/enhanced-lease-analyzer.ts
// Enhanced lease document analysis with improved OCR and clause detection

interface OCROptions {
  quality: 'high' | 'medium' | 'low';
  dpi: number;
  preprocessor?: 'enhance' | 'standard';
  language: string;
  extractTables: boolean;
  preserveFormatting: boolean;
}

interface OCRResult {
  text: string;
  engine: string;
  confidence: number;
}

interface DocumentQualityAssessment {
  quality: 'good' | 'fair' | 'poor';
  issues: string[];
  errorRate: number;
  wordCount: number;
}

interface LeaseClause {
  number?: string;
  text: string;
  index: number;
  type: string;
  confidence: number;
}

interface AnalysisResult {
  answer: string;
  citations: Array<{
    clause: string;
    schedule?: string;
    paragraph?: string;
    text: string;
  }>;
  confidence: number;
  clauses?: LeaseClause[];
  recommendation?: string;
  documentInfo?: {
    extractedLength: number;
    quality: string;
    processingEngine: string;
    issues: string[];
  };
}

// 1. IMPROVED OCR PROCESSING
export async function processDocumentWithBetterOCR(file: File): Promise<OCRResult> {
  try {
    // Use higher quality OCR settings
    const ocrOptions: OCROptions = {
      quality: 'high',
      dpi: 300,
      preprocessor: 'enhance', // Improve text clarity
      language: 'eng',
      extractTables: true,
      preserveFormatting: true
    };
    
    const result = await ocrAPI.process(file, ocrOptions);
    
    // Validate extraction quality
    if (result.text.length < 5000) { // A lease should be much longer
      console.warn('⚠️ OCR extraction seems incomplete, retrying with different settings');
      // Retry with different OCR engine or settings
      return await retryOCRWithAlternativeEngine(file);
    }
    
    return result;
  } catch (error) {
    console.error('OCR processing failed:', error);
    throw error;
  }
}

// 2. IMPROVED CLAUSE DETECTION LOGIC
export class LeaseAnalyzer {
  private documentText: string;
  private originalText: string;
  private confidence: number = 0;

  constructor(documentText: string) {
    this.documentText = documentText.toLowerCase();
    this.originalText = documentText;
  }
  
  findMaintenanceResponsibilities(): AnalysisResult {
    const maintenancePatterns = [
      // Common lease clause patterns
      /landlord.*(?:shall|will|agrees to).*(?:maintain|repair|keep in repair)/gi,
      /tenant.*(?:shall|will|agrees to).*(?:maintain|repair|keep in repair)/gi,
      /(?:maintenance|repair).*(?:of|to).*common parts/gi,
      /service charge.*(?:maintenance|repair)/gi,
      /schedule.*(?:landlord|tenant).*covenants/gi,
      /common parts.*(?:maintained|repaired)/gi
    ];
    
    const results: Array<{
      clause: LeaseClause;
      type: string;
      confidence: number;
    }> = [];
    
    for (const pattern of maintenancePatterns) {
      const matches = [...this.originalText.matchAll(pattern)];
      matches.forEach(match => {
        results.push({
          clause: this.extractClauseContext(match.index!, 200),
          type: this.categorizeMaintenanceClause(match[0]),
          confidence: this.calculateConfidence(match[0])
        });
      });
    }
    
    return this.synthesizeResults(results);
  }
  
  private extractClauseContext(index: number, contextLength: number = 200): LeaseClause {
    const start = Math.max(0, index - contextLength);
    const end = Math.min(this.originalText.length, index + contextLength);
    const context = this.originalText.slice(start, end);
    
    // Try to find clause numbers
    const clauseMatch = context.match(/(?:clause|paragraph|schedule)\s*(\d+(?:\.\d+)*)/i);
    const clauseNumber = clauseMatch ? clauseMatch[1] : undefined;
    
    return {
      number: clauseNumber,
      text: context.trim(),
      index: start,
      type: 'maintenance',
      confidence: 0
    };
  }
  
  private categorizeMaintenanceClause(clauseText: string): string {
    if (/landlord/i.test(clauseText)) return 'landlord_responsibility';
    if (/tenant/i.test(clauseText)) return 'tenant_responsibility';
    if (/service charge/i.test(clauseText)) return 'service_charge_funded';
    return 'unclear';
  }
  
  private calculateConfidence(clauseText: string): number {
    let confidence = 0;
    
    // Higher confidence for specific terms
    if (/shall|will|agrees to/i.test(clauseText)) confidence += 30;
    if (/common parts/i.test(clauseText)) confidence += 25;
    if (/maintain|repair/i.test(clauseText)) confidence += 20;
    if (/clause|schedule/i.test(clauseText)) confidence += 15;
    if (/landlord|tenant/i.test(clauseText)) confidence += 10;
    
    return Math.min(confidence, 95); // Cap at 95%
  }
  
  private synthesizeResults(results: Array<{clause: LeaseClause; type: string; confidence: number}>): AnalysisResult {
    if (results.length === 0) {
      return {
        answer: "Unable to locate specific maintenance clauses in the extracted text.",
        citations: [],
        confidence: 10,
        recommendation: "Document may need manual review or improved OCR processing."
      };
    }
    
    // Sort by confidence and relevance
    results.sort((a, b) => b.confidence - a.confidence);
    const bestResult = results[0];
    
    if (bestResult.confidence < 40) {
      return {
        answer: "Maintenance responsibilities are unclear from the available text.",
        citations: [`Found ${results.length} potential references but with low confidence.`].map(c => ({
          clause: 'Low Confidence',
          text: c
        })),
        confidence: bestResult.confidence,
        recommendation: "Manual document review recommended."
      };
    }
    
    return {
      answer: this.generateMaintenanceAnswer(results),
      citations: this.formatCitations(results),
      confidence: bestResult.confidence,
      clauses: results.map(r => r.clause)
    };
  }
  
  private generateMaintenanceAnswer(results: Array<{clause: LeaseClause; type: string; confidence: number}>): string {
    const landlordClauses = results.filter(r => r.type === 'landlord_responsibility');
    const tenantClauses = results.filter(r => r.type === 'tenant_responsibility');
    const serviceChargeClauses = results.filter(r => r.type === 'service_charge_funded');
    
    let answer = "";
    
    if (landlordClauses.length > 0) {
      answer += "The landlord is responsible for maintaining common parts. ";
    }
    
    if (serviceChargeClauses.length > 0) {
      answer += "Maintenance costs are typically recovered through service charges. ";
    }
    
    if (tenantClauses.length > 0) {
      answer += "Tenants have specific maintenance obligations as outlined in their covenants. ";
    }
    
    return answer || "Maintenance responsibilities require further clarification.";
  }
  
  private formatCitations(results: Array<{clause: LeaseClause; type: string; confidence: number}>): Array<{clause: string; text: string}> {
    return results
      .filter(r => r.clause.number)
      .map(r => ({
        clause: `Clause ${r.clause.number}`,
        text: `${r.clause.text.substring(0, 100)}...`
      }));
  }

  // Add financial obligations analysis
  findFinancialObligations(): AnalysisResult {
    const financialPatterns = [
      /rent.*payable.*£?\d+/gi,
      /service charge.*£?\d+/gi,
      /ground rent.*£?\d+/gi,
      /insurance.*rent.*£?\d+/gi,
      /maintenance.*charge.*£?\d+/gi
    ];

    const results: Array<{
      clause: LeaseClause;
      type: string;
      confidence: number;
    }> = [];

    for (const pattern of financialPatterns) {
      const matches = [...this.originalText.matchAll(pattern)];
      matches.forEach(match => {
        results.push({
          clause: this.extractClauseContext(match.index!, 200),
          type: 'financial_obligation',
          confidence: this.calculateConfidence(match[0])
        });
      });
    }

    return this.synthesizeResults(results);
  }

  // Comprehensive search for any question
  comprehensiveSearch(question: string): AnalysisResult {
    const keywords = this.extractKeywords(question);
    const searchResults: Array<{
      clause: LeaseClause;
      type: string;
      confidence: number;
    }> = [];

    // Search for keywords in document
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = [...this.originalText.matchAll(regex)];
      
      matches.forEach(match => {
        searchResults.push({
          clause: this.extractClauseContext(match.index!, 300),
          type: 'keyword_match',
          confidence: this.calculateKeywordConfidence(keyword, match[0])
        });
      });
    });

    return this.synthesizeResults(searchResults);
  }

  private extractKeywords(question: string): string[] {
    const stopWords = ['who', 'what', 'when', 'where', 'how', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    return question.toLowerCase()
      .split(/\s+/)
      .filter(word => !stopWords.includes(word) && word.length > 2);
  }

  private calculateKeywordConfidence(keyword: string, context: string): number {
    let confidence = 30; // Base confidence for keyword match
    
    // Boost confidence based on context
    if (/clause|schedule|paragraph/i.test(context)) confidence += 20;
    if (/shall|will|must|agrees/i.test(context)) confidence += 15;
    if (/landlord|tenant|lessor|lessee/i.test(context)) confidence += 10;
    
    return Math.min(confidence, 90);
  }
}

// 3. ENHANCED QUESTION PROCESSING
export async function processLeaseQuestion(question: string, documentText: string): Promise<AnalysisResult> {
  try {
    const analyzer = new LeaseAnalyzer(documentText);
    
    // Route to appropriate analysis method
    if (question.toLowerCase().includes('maintain') || 
        question.toLowerCase().includes('repair') ||
        question.toLowerCase().includes('common parts')) {
      
      return analyzer.findMaintenanceResponsibilities();
    }
    
    // Add other question types...
    if (question.toLowerCase().includes('rent') ||
        question.toLowerCase().includes('service charge')) {
      return analyzer.findFinancialObligations();
    }
    
    // Default comprehensive search
    return analyzer.comprehensiveSearch(question);
    
  } catch (error) {
    console.error('Analysis failed:', error);
    return {
      answer: "Analysis failed due to technical error.",
      citations: [],
      confidence: 0,
      recommendation: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// 4. DOCUMENT QUALITY ASSESSMENT
export function assessDocumentQuality(ocrResult: OCRResult): DocumentQualityAssessment {
  const issues: string[] = [];
  const text = ocrResult.text;
  
  // Check document completeness
  if (text.length < 5000) issues.push('Document appears incomplete');
  if (!text.includes('lease') && !text.includes('tenancy')) issues.push('May not be a lease document');
  if (!text.match(/\d{4}/)) issues.push('No dates found');
  if (!text.includes('£') && !text.includes('pound')) issues.push('No financial terms found');
  
  // Check OCR quality indicators
  const errorChars = (text.match(/[^\w\s£.,;:()\-"']/g) || []).length;
  const totalChars = text.length;
  const errorRate = errorChars / totalChars;
  
  if (errorRate > 0.05) issues.push('High OCR error rate detected');
  
  return {
    quality: issues.length === 0 ? 'good' : issues.length < 3 ? 'fair' : 'poor',
    issues,
    errorRate,
    wordCount: text.split(/\s+/).length
  };
}

// 5. PROGRESSIVE OCR FALLBACKS
export async function robustDocumentProcessing(file: File): Promise<OCRResult> {
  const attempts = [
    { engine: 'primary', settings: { dpi: 300, quality: 'high' as const } },
    { engine: 'secondary', settings: { dpi: 400, preprocessing: 'aggressive' } },
    { engine: 'fallback', settings: { dpi: 200, mode: 'legacy' } }
  ];
  
  for (const attempt of attempts) {
    try {
      console.log(`🔄 Trying OCR with ${attempt.engine} engine`);
      const result = await processWithEngine(file, attempt.engine, attempt.settings);
      
      const quality = assessDocumentQuality(result);
      if (quality.quality !== 'poor') {
        console.log(`✅ Successful extraction with ${attempt.engine} engine`);
        return result;
      }
    } catch (error) {
      console.warn(`❌ ${attempt.engine} engine failed:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
  }
  
  throw new Error('All OCR engines failed to extract readable content');
}

// 6. IMPROVED RESPONSE FORMATTING
export function formatAnalysisResponse(analysisResult: any): AnalysisResult {
  // Ensure we have valid data before rendering
  if (!analysisResult || typeof analysisResult !== 'object') {
    return {
      answer: "Analysis could not be completed.",
      confidence: 0,
      citations: [],
      recommendation: "No valid analysis data available."
    };
  }
  
  // Validate confidence scoring
  const confidence = Math.max(0, Math.min(100, analysisResult.confidence || 0));
  
  return {
    answer: analysisResult.answer || "No specific answer found.",
    citations: Array.isArray(analysisResult.citations) ? analysisResult.citations : [],
    confidence,
    clauses: Array.isArray(analysisResult.clauses) ? analysisResult.clauses : [],
    recommendation: analysisResult.recommendation
  };
}

// Helper functions for OCR processing (mock implementations)
const ocrAPI = {
  async process(file: File, options: OCROptions): Promise<OCRResult> {
    // This would be replaced with actual OCR service calls
    // For now, return a mock result
    return {
      text: "Mock OCR result - replace with actual OCR implementation",
      engine: "primary",
      confidence: 0.85
    };
  }
};

async function retryOCRWithAlternativeEngine(file: File): Promise<OCRResult> {
  // Mock implementation - replace with actual fallback OCR
  return {
    text: "Alternative OCR result - replace with actual implementation",
    engine: "fallback",
    confidence: 0.75
  };
}

async function processWithEngine(file: File, engine: string, settings: any): Promise<OCRResult> {
  // Mock implementation - replace with actual OCR engine calls
  return {
    text: `OCR result from ${engine} engine`,
    engine,
    confidence: 0.8
  };
}

// 7. MAIN HANDLER FUNCTION
export async function handleDocumentQuestion(question: string, documentFile: File): Promise<AnalysisResult> {
  try {
    // Step 1: Robust OCR with fallbacks
    const ocrResult = await robustDocumentProcessing(documentFile);
    
    // Step 2: Assess document quality
    const quality = assessDocumentQuality(ocrResult);
    if (quality.quality === 'poor') {
      return {
        answer: `Document quality is poor (${quality.issues.join(', ')}). Analysis may be unreliable.`,
        confidence: 20,
        citations: [],
        recommendation: "Consider re-scanning the document or providing a clearer image.",
        documentInfo: {
          extractedLength: ocrResult.text.length,
          quality: quality.quality,
          processingEngine: ocrResult.engine,
          issues: quality.issues
        }
      };
    }
    
    // Step 3: Enhanced analysis
    const analysis = await processLeaseQuestion(question, ocrResult.text);
    
    // Step 4: Quality-adjusted confidence
    analysis.confidence = adjustConfidenceForQuality(analysis.confidence, quality);
    
    // Step 5: Add document metadata
    analysis.documentInfo = {
      extractedLength: ocrResult.text.length,
      quality: quality.quality,
      processingEngine: ocrResult.engine,
      issues: quality.issues
    };
    
    return analysis;
    
  } catch (error) {
    console.error('Complete document processing failed:', error);
    return {
      answer: "Unable to process document. Please check file format and quality.",
      confidence: 0,
      citations: [],
      recommendation: error instanceof Error ? error.message : "Try uploading a clearer scan or different file format."
    };
  }
}

function adjustConfidenceForQuality(originalConfidence: number, quality: DocumentQualityAssessment): number {
  const qualityMultiplier = {
    'good': 1.0,
    'fair': 0.8,
    'poor': 0.5
  };
  
  return Math.round(originalConfidence * qualityMultiplier[quality.quality]);
}