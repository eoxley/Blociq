/**
 * Lease Document Analyzer for BlocIQ
 * Uses OpenAI API to extract structured lease data and compliance information
 */

import OpenAI from 'openai';

export interface LeaseAnalysis {
  // Basic lease information
  propertyDetails: {
    address?: string;
    propertyType?: string;
    leaseTerm?: string;
    startDate?: string;
    endDate?: string;
    premium?: string;
    groundRent?: string;
  };
  
  // Financial obligations
  financialObligations: {
    rent?: string;
    rentReviewDate?: string;
    serviceCharge?: string;
    serviceChargeReviewDate?: string;
    insurance?: string;
    insuranceReviewDate?: string;
    reserveFund?: string;
    reserveFundReviewDate?: string;
  };
  
  // Key rights and restrictions
  rightsAndRestrictions: {
    parkingRights?: string;
    rightOfAccess?: string;
    tvLicence?: string;
    assignmentRights?: string;
    alterationRights?: string;
    subletRights?: string;
    petPermissions?: string;
    decorationRights?: string;
  };
  
  // Service provisions
  serviceProvisions: {
    windows?: string;
    pipes?: string;
    heating?: string;
    electrical?: string;
    plumbing?: string;
    structural?: string;
    exterior?: string;
    interior?: string;
  };
  
  // Compliance checklist
  complianceChecklist: {
    termConsentInFavourOfClient: boolean;
    reserveFund: boolean;
    windowsPipesHeatingProvisions: boolean;
    parkingRights: boolean;
    rightOfAccess: boolean;
    tvAssignmentAlterationsClauses: boolean;
    noticeRequirements: boolean;
    subletPetsPermissions: boolean;
    debtRecoveryInterestTerms: boolean;
    exteriorInteriorRedecorationObligations: boolean;
  };
  
  // Additional information
  additionalInfo: {
    breakClause?: string;
    forfeitureClause?: string;
    disputeResolution?: string;
    legalCosts?: string;
    stampDuty?: string;
    registrationRequirements?: string;
  };
  
  // Analysis metadata
  metadata: {
    confidence: number;
    extractedDate: string;
    documentType: 'lease' | 'lease_variation' | 'lease_assignment' | 'other';
    analysisVersion: string;
    warnings?: string[];
    notes?: string[];
  };
}

export interface LeaseAnalysisOptions {
  includeComplianceChecklist?: boolean;
  extractFinancialDetails?: boolean;
  analyzeServiceProvisions?: boolean;
  customPrompt?: string;
}

/**
 * Analyze lease document using OpenAI
 * @param extractedText - OCR extracted text from lease document
 * @param options - Analysis options
 * @returns Promise<LeaseAnalysis> - Structured lease analysis
 */
export async function analyzeLease(
  extractedText: string,
  options: LeaseAnalysisOptions = {}
): Promise<LeaseAnalysis> {
  try {
    // Validate input
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text provided for analysis');
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });

    // Build the analysis prompt
    const prompt = buildLeaseAnalysisPrompt(extractedText, options);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a UK property law expert specializing in lease analysis. 
          Extract structured information from lease documents and provide comprehensive analysis.
          Always return valid JSON in the exact format specified.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    // Parse the response
    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI API');
    }

    // Parse JSON response
    let analysis: LeaseAnalysis;
    try {
      analysis = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Failed to parse OpenAI response: ${parseError}`);
    }

    // Validate the analysis structure
    const validatedAnalysis = validateLeaseAnalysis(analysis);
    
    // Add metadata
    validatedAnalysis.metadata.extractedDate = new Date().toISOString();
    validatedAnalysis.metadata.analysisVersion = '1.0.0';

    return validatedAnalysis;

  } catch (error) {
    console.error('❌ Lease analysis failed:', error);
    
    // Return error analysis
    return {
      propertyDetails: {},
      financialObligations: {},
      rightsAndRestrictions: {},
      serviceProvisions: {},
      complianceChecklist: {
        termConsentInFavourOfClient: false,
        reserveFund: false,
        windowsPipesHeatingProvisions: false,
        parkingRights: false,
        rightOfAccess: false,
        tvAssignmentAlterationsClauses: false,
        noticeRequirements: false,
        subletPetsPermissions: false,
        debtRecoveryInterestTerms: false,
        exteriorInteriorRedecorationObligations: false,
      },
      additionalInfo: {},
      metadata: {
        confidence: 0,
        extractedDate: new Date().toISOString(),
        documentType: 'other',
        analysisVersion: '1.0.0',
        warnings: ['Analysis failed due to error'],
        notes: [error instanceof Error ? error.message : 'Unknown error occurred']
      }
    };
  }
}

/**
 * Build the analysis prompt for OpenAI
 * @param extractedText - OCR extracted text
 * @param options - Analysis options
 * @returns string - Formatted prompt
 */
function buildLeaseAnalysisPrompt(
  extractedText: string, 
  options: LeaseAnalysisOptions
): string {
  const basePrompt = `Analyze the following UK lease document text and extract structured information.

LEASE TEXT:
${extractedText}

Please analyze this lease and return a JSON object with the following structure:

{
  "propertyDetails": {
    "address": "Property address if found",
    "propertyType": "Type of property (flat, house, commercial, etc.)",
    "leaseTerm": "Lease term (e.g., 99 years, 125 years)",
    "startDate": "Lease start date if specified",
    "endDate": "Lease end date if specified",
    "premium": "Premium paid if any",
    "groundRent": "Ground rent amount if specified"
  },
  "financialObligations": {
    "rent": "Rent amount and frequency",
    "rentReviewDate": "Next rent review date",
    "serviceCharge": "Service charge amount and what it covers",
    "serviceChargeReviewDate": "Next service charge review date",
    "insurance": "Insurance obligations and amounts",
    "insuranceReviewDate": "Next insurance review date",
    "reserveFund": "Reserve fund contributions",
    "reserveFundReviewDate": "Next reserve fund review date"
  },
  "rightsAndRestrictions": {
    "parkingRights": "Parking rights and restrictions",
    "rightOfAccess": "Right of access provisions",
    "tvLicence": "TV licence obligations",
    "assignmentRights": "Assignment and subletting rights",
    "alterationRights": "Alteration rights and restrictions",
    "subletRights": "Subletting permissions and conditions",
    "petPermissions": "Pet permissions and restrictions",
    "decorationRights": "Decoration rights and restrictions"
  },
  "serviceProvisions": {
    "windows": "Window maintenance and replacement",
    "pipes": "Pipe maintenance and responsibility",
    "heating": "Heating system maintenance",
    "electrical": "Electrical system maintenance",
    "plumbing": "Plumbing maintenance",
    "structural": "Structural maintenance",
    "exterior": "Exterior maintenance",
    "interior": "Interior maintenance"
  },
  "complianceChecklist": {
    "termConsentInFavourOfClient": true/false,
    "reserveFund": true/false,
    "windowsPipesHeatingProvisions": true/false,
    "parkingRights": true/false,
    "rightOfAccess": true/false,
    "tvAssignmentAlterationsClauses": true/false,
    "noticeRequirements": true/false,
    "subletPetsPermissions": true/false,
    "debtRecoveryInterestTerms": true/false,
    "exteriorInteriorRedecorationObligations": true/false
  },
  "additionalInfo": {
    "breakClause": "Break clause details if any",
    "forfeitureClause": "Forfeiture clause details",
    "disputeResolution": "Dispute resolution procedures",
    "legalCosts": "Legal costs provisions",
    "stampDuty": "Stamp duty obligations",
    "registrationRequirements": "Land Registry registration requirements"
  },
  "metadata": {
    "confidence": 0.95,
    "documentType": "lease",
    "warnings": [],
    "notes": []
  }
}

IMPORTANT:
- Set boolean values to true if the provision is clearly present, false if absent or unclear
- Extract dates in ISO format (YYYY-MM-DD) if possible
- For monetary amounts, include the currency and frequency
- If information is not found, use null or empty string
- Set confidence based on text clarity and completeness
- Add warnings for any unclear or ambiguous provisions
- Focus on UK leasehold law requirements and common provisions`;

  if (options.customPrompt) {
    return `${basePrompt}\n\nADDITIONAL REQUIREMENTS:\n${options.customPrompt}`;
  }

  return basePrompt;
}

/**
 * Validate lease analysis structure
 * @param analysis - Raw analysis from OpenAI
 * @returns LeaseAnalysis - Validated analysis
 */
function validateLeaseAnalysis(analysis: any): LeaseAnalysis {
  // Ensure all required fields exist with defaults
  const validated: LeaseAnalysis = {
    propertyDetails: analysis.propertyDetails || {},
    financialObligations: analysis.financialObligations || {},
    rightsAndRestrictions: analysis.rightsAndRestrictions || {},
    serviceProvisions: analysis.serviceProvisions || {},
    complianceChecklist: {
      termConsentInFavourOfClient: Boolean(analysis.complianceChecklist?.termConsentInFavourOfClient),
      reserveFund: Boolean(analysis.complianceChecklist?.reserveFund),
      windowsPipesHeatingProvisions: Boolean(analysis.complianceChecklist?.windowsPipesHeatingProvisions),
      parkingRights: Boolean(analysis.complianceChecklist?.parkingRights),
      rightOfAccess: Boolean(analysis.complianceChecklist?.rightOfAccess),
      tvAssignmentAlterationsClauses: Boolean(analysis.complianceChecklist?.tvAssignmentAlterationsClauses),
      noticeRequirements: Boolean(analysis.complianceChecklist?.noticeRequirements),
      subletPetsPermissions: Boolean(analysis.complianceChecklist?.subletPetsPermissions),
      debtRecoveryInterestTerms: Boolean(analysis.complianceChecklist?.debtRecoveryInterestTerms),
      exteriorInteriorRedecorationObligations: Boolean(analysis.complianceChecklist?.exteriorInteriorRedecorationObligations),
    },
    additionalInfo: analysis.additionalInfo || {},
    metadata: {
      confidence: Number(analysis.metadata?.confidence) || 0.8,
      extractedDate: analysis.metadata?.extractedDate || new Date().toISOString(),
      documentType: analysis.metadata?.documentType || 'lease',
      analysisVersion: analysis.metadata?.analysisVersion || '1.0.0',
      warnings: Array.isArray(analysis.metadata?.warnings) ? analysis.metadata.warnings : [],
      notes: Array.isArray(analysis.metadata?.notes) ? analysis.metadata.notes : []
    }
  };

  return validated;
}

/**
 * Generate compliance summary from lease analysis
 * @param analysis - Lease analysis result
 * @returns string - Human-readable compliance summary
 */
export function generateComplianceSummary(analysis: LeaseAnalysis): string {
  const checklist = analysis.complianceChecklist;
  const totalItems = Object.keys(checklist).length;
  const compliantItems = Object.values(checklist).filter(Boolean).length;
  const compliancePercentage = Math.round((compliantItems / totalItems) * 100);

  let summary = `Lease Compliance Summary: ${compliantItems}/${totalItems} items compliant (${compliancePercentage}%)\n\n`;

  // Add specific compliance details
  if (checklist.termConsentInFavourOfClient) {
    summary += "✅ Term Consent in favour of Client\n";
  } else {
    summary += "❌ Term Consent in favour of Client - Missing\n";
  }

  if (checklist.reserveFund) {
    summary += "✅ Reserve Fund provisions\n";
  } else {
    summary += "❌ Reserve Fund provisions - Missing\n";
  }

  if (checklist.windowsPipesHeatingProvisions) {
    summary += "✅ Windows/Pipes/Heating provisions\n";
  } else {
    summary += "❌ Windows/Pipes/Heating provisions - Missing\n";
  }

  if (checklist.parkingRights) {
    summary += "✅ Parking rights defined\n";
  } else {
    summary += "❌ Parking rights - Not clearly defined\n";
  }

  if (checklist.rightOfAccess) {
    summary += "✅ Right of Access provisions\n";
  } else {
    summary += "❌ Right of Access - Missing\n";
  }

  return summary;
}

/**
 * Extract key dates from lease analysis
 * @param analysis - Lease analysis result
 * @returns Array of key dates with descriptions
 */
export function extractKeyDates(analysis: LeaseAnalysis): Array<{ date: string; description: string; type: 'start' | 'end' | 'review' | 'other' }> {
  const dates: Array<{ date: string; description: string; type: 'start' | 'end' | 'review' | 'other' }> = [];

  // Property details dates
  if (analysis.propertyDetails.startDate) {
    dates.push({ date: analysis.propertyDetails.startDate, description: 'Lease Start Date', type: 'start' });
  }
  if (analysis.propertyDetails.endDate) {
    dates.push({ date: analysis.propertyDetails.endDate, description: 'Lease End Date', type: 'end' });
  }

  // Financial review dates
  if (analysis.financialObligations.rentReviewDate) {
    dates.push({ date: analysis.financialObligations.rentReviewDate, description: 'Rent Review Date', type: 'review' });
  }
  if (analysis.financialObligations.serviceChargeReviewDate) {
    dates.push({ date: analysis.financialObligations.serviceChargeReviewDate, description: 'Service Charge Review Date', type: 'review' });
  }
  if (analysis.financialObligations.insuranceReviewDate) {
    dates.push({ date: analysis.financialObligations.insuranceReviewDate, description: 'Insurance Review Date', type: 'review' });
  }
  if (analysis.financialObligations.reserveFundReviewDate) {
    dates.push({ date: analysis.financialObligations.reserveFundReviewDate, description: 'Reserve Fund Review Date', type: 'review' });
  }

  return dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
