// Intelligent OCR Method Selection
// Analyzes document characteristics and selects optimal extraction method

import crypto from 'crypto';

export interface FileCharacteristics {
  hasTextLayer: boolean;
  isScanned: boolean;
  quality: 'high' | 'medium' | 'low';
  estimatedPages: number;
  fileSize: number;
  complexity: 'simple' | 'moderate' | 'complex';
  documentType: 'lease' | 'certificate' | 'report' | 'other';
}

export interface ExtractionMethod {
  name: string;
  priority: number;
  suitability: number; // 0-1 score
  estimatedTime: number; // seconds
  reliability: number; // 0-1 score
}

export interface ExtractionStats {
  char_count: number;
  word_count: number;
  page_count: number;
  confidence_scores: Record<string, number>;
  processing_time: number;
  method_used: string;
  quality_indicators: {
    has_structure: boolean;
    has_property_terms: boolean;
    has_dates: boolean;
    has_financial_figures: boolean;
    has_addresses: boolean;
  };
}

export interface ExtractionQualityDetailed {
  score: number; // 0-1, where 1 is perfect
  char_count: number;
  expected_chars: number;
  completion_rate: number;
  structure_preserved: boolean;
  financial_figures_found: number;
  addresses_found: number;
  quality_level: 'excellent' | 'good' | 'acceptable' | 'poor' | 'failed';
  warnings: string[];
  recommendations: string[];
}

/**
 * Generate file hash for caching
 */
export function generateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Analyze file characteristics to determine optimal OCR approach
 */
export async function analyzeFileCharacteristics(file: File): Promise<FileCharacteristics> {
  const buffer = Buffer.from(await file.arrayBuffer());
  
  // Basic file analysis
  const fileSize = file.size;
  const estimatedPages = Math.max(1, Math.floor(fileSize / (50 * 1024))); // Rough estimate: 50KB per page
  
  // Try to detect if PDF has text layer
  let hasTextLayer = false;
  let isScanned = true;
  let quality: 'high' | 'medium' | 'low' = 'medium';
  
  try {
    // Quick text layer check using pdf-parse
    const { safePdfParse } = await import('../pdf-parse-wrapper');
    const result = await safePdfParse(buffer, { max: 1 }); // Only check first page
    
    const textLength = result.text?.length || 0;
    const expectedTextPerPage = 500; // Minimum expected characters per page for text-based PDF
    
    if (textLength > expectedTextPerPage) {
      hasTextLayer = true;
      isScanned = false;
      quality = textLength > expectedTextPerPage * 2 ? 'high' : 'medium';
    } else if (textLength > 50) {
      hasTextLayer = true;
      isScanned = true; // Mixed content
      quality = 'medium';
    } else {
      hasTextLayer = false;
      isScanned = true;
      quality = 'low';
    }
  } catch (error) {
    console.log('📋 Text layer analysis failed, assuming scanned document');
    hasTextLayer = false;
    isScanned = true;
    quality = 'low';
  }
  
  // Determine document type from filename
  const filename = file.name.toLowerCase();
  let documentType: 'lease' | 'certificate' | 'report' | 'other' = 'other';
  
  if (/lease|tenancy|agreement/.test(filename)) {
    documentType = 'lease';
  } else if (/certificate|cert|eicr|fra|insurance/.test(filename)) {
    documentType = 'certificate';
  } else if (/report|assessment|survey/.test(filename)) {
    documentType = 'report';
  }
  
  // Determine complexity
  let complexity: 'simple' | 'moderate' | 'complex' = 'moderate';
  if (fileSize < 1024 * 1024) { // < 1MB
    complexity = 'simple';
  } else if (fileSize > 10 * 1024 * 1024) { // > 10MB
    complexity = 'complex';
  }
  
  return {
    hasTextLayer,
    isScanned,
    quality,
    estimatedPages,
    fileSize,
    complexity,
    documentType
  };
}

/**
 * Select optimal OCR methods based on file characteristics
 */
export function selectOptimalOCRMethods(characteristics: FileCharacteristics): ExtractionMethod[] {
  const methods: ExtractionMethod[] = [];
  
  // Method 1: PDF Text Layer (fastest, most reliable for text-based PDFs)
  if (characteristics.hasTextLayer && !characteristics.isScanned) {
    methods.push({
      name: 'pdf_text_layer',
      priority: 1,
      suitability: characteristics.quality === 'high' ? 0.95 : 0.80,
      estimatedTime: 2,
      reliability: 0.95
    });
  }
  
  // Method 2: OpenAI File Extraction (good for mixed content)
  if (characteristics.complexity !== 'complex') {
    methods.push({
      name: 'openai_extraction',
      priority: characteristics.hasTextLayer ? 2 : 1,
      suitability: characteristics.documentType === 'lease' ? 0.85 : 0.75,
      estimatedTime: 15,
      reliability: 0.80
    });
  }
  
  // Method 3: Google Vision OCR (best for scanned documents)
  methods.push({
    name: 'google_vision_ocr',
    priority: characteristics.isScanned ? 1 : 3,
    suitability: characteristics.isScanned ? 0.90 : 0.70,
    estimatedTime: characteristics.estimatedPages * 3,
    reliability: 0.85
  });
  
  // Method 4: Enhanced Google Vision (most thorough, slowest)
  if (characteristics.quality === 'low' || characteristics.complexity === 'complex') {
    methods.push({
      name: 'enhanced_google_vision',
      priority: 4,
      suitability: characteristics.quality === 'low' ? 0.80 : 0.60,
      estimatedTime: characteristics.estimatedPages * 8,
      reliability: 0.75
    });
  }
  
  // Sort by priority and suitability
  return methods.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.suitability - a.suitability;
  });
}

/**
 * Calculate detailed extraction quality metrics
 */
export function calculateExtractionQuality(
  text: string, 
  file: File, 
  characteristics: FileCharacteristics
): ExtractionQualityDetailed {
  const charCount = text.trim().length;
  const wordCount = text.trim().split(/\s+/).length;
  
  // Calculate expected content based on file characteristics
  const expectedCharsPerPage = characteristics.hasTextLayer ? 2000 : 800;
  const expectedChars = characteristics.estimatedPages * expectedCharsPerPage;
  const completionRate = Math.min(1, charCount / expectedChars);
  
  // Quality indicators
  const hasStructure = /\b(clause|section|\d+\.\d+|\d+\)|\([a-z]\))/i.test(text);
  const hasPropertyTerms = /\b(lease|property|building|flat|apartment|premises|demised)/i.test(text);
  const hasDates = /\b(20\d{2}|19\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/.test(text);
  const hasFinancialFigures = /£[\d,]+\.?\d*|\b\d+\s*(?:pounds?|pence)\b/gi.test(text);
  const hasAddresses = /\b\d+\s+[A-Za-z\s]+(road|street|avenue|close|court|gardens|lane|drive|way|place)\b/gi.test(text);
  
  const financialFiguresFound = (text.match(/£[\d,]+\.?\d*|\b\d+\s*(?:pounds?|pence)\b/gi) || []).length;
  const addressesFound = (text.match(/\b\d+\s+[A-Za-z\s]+(road|street|avenue|close|court|gardens|lane|drive|way|place)\b/gi) || []).length;
  
  // Calculate score
  let score = 0;
  
  // Completion rate score (0-0.4)
  score += completionRate * 0.4;
  
  // Content quality score (0-0.6)
  if (hasStructure) score += 0.15;
  if (hasPropertyTerms) score += 0.15;
  if (hasDates) score += 0.1;
  if (hasFinancialFigures) score += 0.1;
  if (hasAddresses) score += 0.1;
  
  // Determine quality level
  let qualityLevel: 'excellent' | 'good' | 'acceptable' | 'poor' | 'failed' = 'failed';
  if (score >= 0.8) qualityLevel = 'excellent';
  else if (score >= 0.6) qualityLevel = 'good';
  else if (score >= 0.4) qualityLevel = 'acceptable';
  else if (score >= 0.2) qualityLevel = 'poor';
  
  // Generate warnings
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  if (completionRate < 0.3) {
    warnings.push('Very low text extraction rate - document may be heavily scanned or corrupted');
    recommendations.push('Try Google Vision OCR for better scanned document handling');
  }
  
  if (!hasStructure) {
    warnings.push('No document structure detected - formatting may be lost');
    recommendations.push('Manual review recommended to verify clause numbering');
  }
  
  if (!hasPropertyTerms) {
    warnings.push('No property/lease terminology detected');
    recommendations.push('Verify this is the correct document type');
  }
  
  if (charCount < 1000 && characteristics.fileSize > 1024 * 1024) {
    warnings.push('Large file with minimal text extraction');
    recommendations.push('Document may require specialized OCR processing');
  }
  
  return {
    score,
    char_count: charCount,
    expected_chars: expectedChars,
    completion_rate: completionRate,
    structure_preserved: hasStructure,
    financial_figures_found: financialFiguresFound,
    addresses_found: addressesFound,
    quality_level: qualityLevel,
    warnings,
    recommendations
  };
}

/**
 * Generate comprehensive extraction statistics
 */
export function generateExtractionStats(
  text: string,
  processingTime: number,
  methodUsed: string,
  characteristics: FileCharacteristics
): ExtractionStats {
  const charCount = text.trim().length;
  const wordCount = text.trim().split(/\s+/).length;
  
  const qualityIndicators = {
    has_structure: /\b(clause|section|\d+\.\d+|\d+\)|\([a-z]\))/i.test(text),
    has_property_terms: /\b(lease|property|building|flat|apartment|premises|demised)/i.test(text),
    has_dates: /\b(20\d{2}|19\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/.test(text),
    has_financial_figures: /£[\d,]+\.?\d*|\b\d+\s*(?:pounds?|pence)\b/gi.test(text),
    has_addresses: /\b\d+\s+[A-Za-z\s]+(road|street|avenue|close|court|gardens|lane|drive|way|place)\b/gi.test(text)
  };
  
  const confidenceScores = {
    text_extraction: Math.min(1, charCount / (characteristics.estimatedPages * 1000)),
    structure_preservation: qualityIndicators.has_structure ? 0.9 : 0.3,
    content_relevance: qualityIndicators.has_property_terms ? 0.9 : 0.1,
    completeness: Math.min(1, wordCount / (characteristics.estimatedPages * 200))
  };
  
  return {
    char_count: charCount,
    word_count: wordCount,
    page_count: characteristics.estimatedPages,
    confidence_scores: confidenceScores,
    processing_time: processingTime,
    method_used: methodUsed,
    quality_indicators: qualityIndicators
  };
}
