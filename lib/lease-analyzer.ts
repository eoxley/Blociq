/**
 * Lease Analyzer for BlocIQ
 * Uses OpenAI API to extract structured lease data from OCR text
 */

import { openai } from './openai';
import { OCRResult } from './ocr';

export interface PropertyDetails {
  address: string;
  term: string;
  premium: string;
  propertyType: string;
  unitNumber?: string;
  buildingName?: string;
}

export interface FinancialObligations {
  rent: string;
  rentFrequency: string;
  serviceCharge: string;
  serviceChargeFrequency: string;
  insurance: string;
  groundRent?: string;
  groundRentFrequency?: string;
  otherCharges: string[];
}

export interface KeyRightsAndRestrictions {
  useOfPremises: string;
  alterations: string;
  subletting: string;
  pets: string;
  parking: string;
  accessRights: string;
  quietEnjoyment: string;
}

export interface ServiceProvisions {
  heating: string;
  hotWater: string;
  electricity: string;
  water: string;
  waste: string;
  maintenance: string;
  repairs: string;
}

export interface LeaseComplianceChecklist {
  termConsentInFavourOfClient: 'YES' | 'NO' | 'UNCLEAR';
  reserveFund: 'YES' | 'NO' | 'UNCLEAR';
  windowsPipesHeatingProvisions: 'YES' | 'NO' | 'UNCLEAR';
  parkingRights: 'YES' | 'NO' | 'UNCLEAR';
  rightOfAccess: 'YES' | 'NO' | 'UNCLEAR';
  tvAssignmentAlterationsClauses: 'YES' | 'NO' | 'UNCLEAR';
  noticeRequirements: 'YES' | 'NO' | 'UNCLEAR';
  subletPetsPermissions: 'YES' | 'NO' | 'UNCLEAR';
  debtRecoveryInterestTerms: 'YES' | 'NO' | 'UNCLEAR';
  exteriorInteriorRedecorationObligations: 'YES' | 'NO' | 'UNCLEAR';
}

export interface LeaseAnalysis {
  propertyDetails: PropertyDetails;
  financialObligations: FinancialObligations;
  keyRightsAndRestrictions: KeyRightsAndRestrictions;
  serviceProvisions: ServiceProvisions;
  complianceChecklist: LeaseComplianceChecklist;
  keyDates: {
    startDate: string;
    endDate: string;
    breakClause?: string;
    reviewDates?: string[];
  };
  importantClauses: string[];
  riskFactors: string[];
  recommendations: string[];
  confidence: 'high' | 'medium' | 'low';
  extractedAt: string;
  source: string;
}

export interface LeaseAnalysisError {
  message: string;
  code: 'OPENAI_ERROR' | 'PARSING_ERROR' | 'INVALID_INPUT' | 'UNKNOWN_ERROR';
  details?: string;
}

/**
 * Analyze lease document using OpenAI API
 * @param extractedText - OCR extracted text from lease document
 * @returns Promise<LeaseAnalysis> - Structured lease analysis
 */
export async function analyzeLease(extractedText: string): Promise<LeaseAnalysis> {
  try {
    console.log('🔍 Starting lease analysis with OpenAI...');
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw {
        message: 'No text provided for analysis',
        code: 'INVALID_INPUT' as const,
        details: 'Extracted text is empty or null'
      } as LeaseAnalysisError;
    }

    if (extractedText.length < 100) {
      throw {
        message: 'Insufficient text for lease analysis',
        code: 'INVALID_INPUT' as const,
        details: `Text too short: ${extractedText.length} characters (minimum 100 required)`
      } as LeaseAnalysisError;
    }

    // Create comprehensive prompt for lease analysis
    const analysisPrompt = createLeaseAnalysisPrompt(extractedText);
    
    console.log('🤖 Sending to OpenAI for analysis...');
    
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a UK property law expert specializing in lease analysis. 
          Your task is to extract structured information from lease documents and provide 
          a comprehensive analysis in the exact JSON format specified. Be thorough and 
          accurate in your analysis.`
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.1, // Low temperature for consistent, structured output
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw {
        message: 'No response received from OpenAI',
        code: 'OPENAI_ERROR' as const,
        details: 'Empty response from API'
      } as LeaseAnalysisError;
    }

    console.log('✅ Received OpenAI response, parsing...');
    
    // Parse the JSON response
    let parsedAnalysis: any;
    try {
      parsedAnalysis = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', parseError);
      throw {
        message: 'Failed to parse AI analysis response',
        code: 'PARSING_ERROR' as const,
        details: `JSON parsing error: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`
      } as LeaseAnalysisError;
    }

    // Validate the parsed response structure
    const validatedAnalysis = validateLeaseAnalysis(parsedAnalysis);
    
    // Add metadata
    const finalAnalysis: LeaseAnalysis = {
      ...validatedAnalysis,
      extractedAt: new Date().toISOString(),
      source: 'openai_lease_analyzer'
    };

    console.log('✅ Lease analysis completed successfully');
    
    return finalAnalysis;

  } catch (error) {
    console.error('❌ Lease analysis failed:', error);
    
    if (error && typeof error === 'object' && 'code' in error) {
      throw error as LeaseAnalysisError;
    }
    
    // Handle OpenAI-specific errors
    if (error instanceof Error) {
      if (error.message.includes('OpenAI')) {
        throw {
          message: 'OpenAI service error. Please try again later.',
          code: 'OPENAI_ERROR' as const,
          details: error.message
        } as LeaseAnalysisError;
      }
    }
    
    // Generic error fallback
    throw {
      message: 'Lease analysis failed. Please try again or contact support.',
      code: 'UNKNOWN_ERROR' as const,
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    } as LeaseAnalysisError;
  }
}

/**
 * Create comprehensive prompt for lease analysis
 */
function createLeaseAnalysisPrompt(extractedText: string): string {
  return `Please analyze the following lease document text and extract structured information in the exact JSON format specified below.

LEASE TEXT:
${extractedText.substring(0, 8000)}${extractedText.length > 8000 ? '...' : ''}

Please provide a comprehensive analysis in this exact JSON format:

{
  "propertyDetails": {
    "address": "Full property address",
    "term": "Lease term (e.g., '99 years from 1st January 2020')",
    "premium": "Lease premium amount",
    "propertyType": "Type of property (e.g., 'Flat', 'House', 'Commercial Unit')",
    "unitNumber": "Unit number if applicable",
    "buildingName": "Building name if applicable"
  },
  "financialObligations": {
    "rent": "Annual rent amount",
    "rentFrequency": "Rent payment frequency (e.g., 'Monthly', 'Quarterly', 'Annually')",
    "serviceCharge": "Annual service charge amount",
    "serviceChargeFrequency": "Service charge frequency",
    "insurance": "Insurance requirements or costs",
    "groundRent": "Ground rent if applicable",
    "groundRentFrequency": "Ground rent frequency if applicable",
    "otherCharges": ["List of other charges"]
  },
  "keyRightsAndRestrictions": {
    "useOfPremises": "Permitted use of premises",
    "alterations": "Alteration restrictions",
    "subletting": "Subletting permissions",
    "pets": "Pet restrictions",
    "parking": "Parking rights",
    "accessRights": "Access rights and restrictions",
    "quietEnjoyment": "Quiet enjoyment provisions"
  },
  "serviceProvisions": {
    "heating": "Heating provisions",
    "hotWater": "Hot water provisions",
    "electricity": "Electricity provisions",
    "water": "Water provisions",
    "waste": "Waste disposal provisions",
    "maintenance": "Maintenance responsibilities",
    "repairs": "Repair obligations"
  },
  "complianceChecklist": {
    "termConsentInFavourOfClient": "YES/NO/UNCLEAR - Term consent in favour of client",
    "reserveFund": "YES/NO/UNCLEAR - Reserve fund provisions",
    "windowsPipesHeatingProvisions": "YES/NO/UNCLEAR - Windows, pipes, heating provisions",
    "parkingRights": "YES/NO/UNCLEAR - Parking rights specified",
    "rightOfAccess": "YES/NO/UNCLEAR - Right of access provisions",
    "tvAssignmentAlterationsClauses": "YES/NO/UNCLEAR - TV, assignment, alterations clauses",
    "noticeRequirements": "YES/NO/UNCLEAR - Notice requirements specified",
    "subletPetsPermissions": "YES/NO/UNCLEAR - Sublet and pets permissions",
    "debtRecoveryInterestTerms": "YES/NO/UNCLEAR - Debt recovery and interest terms",
    "exteriorInteriorRedecorationObligations": "YES/NO/UNCLEAR - Exterior/interior redecoration obligations"
  },
  "keyDates": {
    "startDate": "Lease start date",
    "endDate": "Lease end date",
    "breakClause": "Break clause details if applicable",
    "reviewDates": ["List of review dates if applicable"]
  },
  "importantClauses": ["List of important clauses to note"],
  "riskFactors": ["List of potential risk factors"],
  "recommendations": ["List of recommendations"],
  "confidence": "high/medium/low - Confidence level in this analysis"
}

IMPORTANT:
1. Extract as much information as possible from the text
2. Use "UNCLEAR" for checklist items where the text is ambiguous
3. Provide specific amounts and dates where available
4. Be thorough in identifying rights, restrictions, and obligations
5. Highlight any unusual or important clauses
6. Assess confidence based on text clarity and completeness
7. Return ONLY valid JSON - no additional text or explanations`;
}

/**
 * Validate the structure of lease analysis response
 */
function validateLeaseAnalysis(analysis: any): LeaseAnalysis {
  // Basic structure validation
  const requiredFields = [
    'propertyDetails', 'financialObligations', 'keyRightsAndRestrictions',
    'serviceProvisions', 'complianceChecklist', 'keyDates',
    'importantClauses', 'riskFactors', 'recommendations', 'confidence'
  ];

  for (const field of requiredFields) {
    if (!analysis[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Validate compliance checklist values
  const checklistFields = [
    'termConsentInFavourOfClient', 'reserveFund', 'windowsPipesHeatingProvisions',
    'parkingRights', 'rightOfAccess', 'tvAssignmentAlterationsClauses',
    'noticeRequirements', 'subletPetsPermissions', 'debtRecoveryInterestTerms',
    'exteriorInteriorRedecorationObligations'
  ];

  for (const field of checklistFields) {
    if (!['YES', 'NO', 'UNCLEAR'].includes(analysis.complianceChecklist[field])) {
      analysis.complianceChecklist[field] = 'UNCLEAR';
    }
  }

  // Validate confidence level
  if (!['high', 'medium', 'low'].includes(analysis.confidence)) {
    analysis.confidence = 'medium';
  }

  // Ensure arrays are arrays
  if (!Array.isArray(analysis.importantClauses)) analysis.importantClauses = [];
  if (!Array.isArray(analysis.riskFactors)) analysis.riskFactors = [];
  if (!Array.isArray(analysis.recommendations)) analysis.recommendations = [];
  if (!Array.isArray(analysis.keyDates.reviewDates)) analysis.keyDates.reviewDates = [];
  if (!Array.isArray(analysis.financialObligations.otherCharges)) analysis.financialObligations.otherCharges = [];

  return analysis as LeaseAnalysis;
}

/**
 * Batch analyze multiple lease documents
 */
export async function batchAnalyzeLeases(ocrResults: OCRResult[]): Promise<{
  results: LeaseAnalysis[];
  errors: { filename: string; error: LeaseAnalysisError }[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    averageConfidence: 'high' | 'medium' | 'low';
  };
}> {
  console.log(`🔍 Starting batch lease analysis for ${ocrResults.length} documents`);
  
  const results: LeaseAnalysis[] = [];
  const errors: { filename: string; error: LeaseAnalysisError }[] = [];
  
  // Process documents sequentially to avoid rate limiting
  for (const ocrResult of ocrResults) {
    try {
      console.log(`📄 Analyzing: ${ocrResult.filename}`);
      const analysis = await analyzeLease(ocrResult.text);
      results.push(analysis);
      console.log(`✅ Analysis complete: ${ocrResult.filename}`);
    } catch (error) {
      const analysisError = error as LeaseAnalysisError;
      errors.push({ filename: ocrResult.filename, error: analysisError });
      console.error(`❌ Analysis failed: ${ocrResult.filename}`, analysisError);
    }
  }
  
  // Calculate summary statistics
  const total = ocrResults.length;
  const successful = results.length;
  const failed = errors.length;
  
  let averageConfidence: 'high' | 'medium' | 'low' = 'medium';
  if (successful > 0) {
    const confidenceScores = results.map(r => {
      switch (r.confidence) {
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 2;
      }
    });
    const avgScore = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    
    if (avgScore >= 2.5) averageConfidence = 'high';
    else if (avgScore >= 1.5) averageConfidence = 'medium';
    else averageConfidence = 'low';
  }
  
  const summary = { total, successful, failed, averageConfidence };
  
  console.log(`📊 Batch lease analysis complete: ${successful} successful, ${failed} failed`);
  console.log(`📈 Average confidence: ${averageConfidence}`);
  
  return { results, errors, summary };
}

/**
 * Generate lease summary report
 */
export function generateLeaseSummary(analyses: LeaseAnalysis[]): {
  totalProperties: number;
  averageTerm: string;
  commonRentRange: string;
  complianceIssues: string[];
  highRiskItems: string[];
  recommendations: string[];
} {
  if (analyses.length === 0) {
    return {
      totalProperties: 0,
      averageTerm: 'N/A',
      commonRentRange: 'N/A',
      complianceIssues: [],
      highRiskItems: [],
      recommendations: []
    };
  }
  
  // Extract common patterns
  const complianceIssues: string[] = [];
  const highRiskItems: string[] = [];
  const recommendations: string[] = [];
  
  analyses.forEach(analysis => {
    // Check for compliance issues
    Object.entries(analysis.complianceChecklist).forEach(([key, value]) => {
      if (value === 'NO') {
        complianceIssues.push(`${key.replace(/([A-Z])/g, ' $1').trim()}: Not compliant`);
      }
    });
    
    // Collect high-risk items
    if (analysis.riskFactors.length > 0) {
      highRiskItems.push(...analysis.riskFactors);
    }
    
    // Collect recommendations
    if (analysis.recommendations.length > 0) {
      recommendations.push(...analysis.recommendations);
    }
  });
  
  // Remove duplicates
  const uniqueComplianceIssues = [...new Set(complianceIssues)];
  const uniqueHighRiskItems = [...new Set(highRiskItems)];
  const uniqueRecommendations = [...new Set(recommendations)];
  
  return {
    totalProperties: analyses.length,
    averageTerm: 'Varies', // Could be enhanced to parse actual terms
    commonRentRange: 'Varies', // Could be enhanced to calculate actual ranges
    complianceIssues: uniqueComplianceIssues,
    highRiskItems: uniqueHighRiskItems,
    recommendations: uniqueRecommendations
  };
}
