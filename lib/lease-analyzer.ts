/**
 * Lease Document Analyzer for BlocIQ
 * Uses OpenAI API to extract structured lease data and compliance information
 */

import { LeaseAnalysis, LeaseComplianceItem, LEASE_COMPLIANCE_CHECKLIST } from '@/types/ai';

// Legacy interface for backward compatibility
export interface LeaseAnalysisLegacy {
  propertyDetails: {
    address?: string;
    propertyType?: string;
    leaseTerm?: string;
    startDate?: string;
    endDate?: string;
    premium?: string;
    groundRent?: string;
  };
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
  additionalInfo: {
    breakClause?: string;
    forfeitureClause?: string;
    disputeResolution?: string;
    legalCosts?: string;
    stampDuty?: string;
    registrationRequirements?: string;
  };
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
 * Legacy analyzeLease function for backward compatibility
 */
export async function analyzeLease(
  extractedText: string,
  options: LeaseAnalysisOptions = {}
): Promise<LeaseAnalysisLegacy> {
  try {
    // Use the new analyzeLeaseDocument function
    const newAnalysis = await analyzeLeaseDocument(extractedText, 'lease_document', undefined);
    
    // Transform to legacy format
    return {
      propertyDetails: {
        address: newAnalysis.leaseDetails?.propertyAddress || '',
        propertyType: newAnalysis.leaseDetails?.buildingType || '',
        leaseTerm: newAnalysis.leaseDetails?.leaseTerm || '',
        startDate: newAnalysis.leaseDetails?.leaseStartDate || '',
        endDate: newAnalysis.leaseDetails?.leaseEndDate || '',
        premium: newAnalysis.leaseDetails?.premium || '',
        groundRent: ''
      },
      financialObligations: {
        rent: newAnalysis.leaseDetails?.initialRent || '',
        rentReviewDate: '',
        serviceCharge: newAnalysis.leaseDetails?.serviceChargePercentage || '',
        serviceChargeReviewDate: '',
        insurance: '',
        insuranceReviewDate: '',
        reserveFund: '',
        reserveFundReviewDate: ''
      },
      rightsAndRestrictions: {
        parkingRights: '',
        rightOfAccess: '',
        tvLicence: '',
        assignmentRights: '',
        alterationRights: '',
        subletRights: '',
        petPermissions: '',
        decorationRights: ''
      },
      serviceProvisions: {
        windows: '',
        pipes: '',
        heating: '',
        electrical: '',
        plumbing: '',
        structural: '',
        exterior: '',
        interior: ''
      },
      complianceChecklist: {
        termConsentInFavourOfClient: (newAnalysis.complianceChecklist || []).some(item => 
          item.item.toLowerCase().includes('term consent') && item.status === 'Y'
        ),
        reserveFund: (newAnalysis.complianceChecklist || []).some(item => 
          item.item.toLowerCase().includes('reserve fund') && item.status === 'Y'
        ),
        windowsPipesHeatingProvisions: (newAnalysis.complianceChecklist || []).some(item => 
          (item.item.toLowerCase().includes('windows') || 
           item.item.toLowerCase().includes('pipes') || 
           item.item.toLowerCase().includes('heating')) && item.status === 'Y'
        ),
        parkingRights: (newAnalysis.complianceChecklist || []).some(item => 
          item.item.toLowerCase().includes('parking') && item.status === 'Y'
        ),
        rightOfAccess: (newAnalysis.complianceChecklist || []).some(item => 
          item.item.toLowerCase().includes('right of access') && item.status === 'Y'
        ),
        tvAssignmentAlterationsClauses: (newAnalysis.complianceChecklist || []).some(item => 
          (item.item.toLowerCase().includes('tv') || 
           item.item.toLowerCase().includes('assignment') || 
           item.item.toLowerCase().includes('alterations')) && item.status === 'Y'
        ),
        noticeRequirements: (newAnalysis.complianceChecklist || []).some(item => 
          item.item.toLowerCase().includes('notice') && item.status === 'Y'
        ),
        subletPetsPermissions: (newAnalysis.complianceChecklist || []).some(item => 
          (item.item.toLowerCase().includes('sublet') || 
           item.item.toLowerCase().includes('pets')) && item.status === 'Y'
        ),
        debtRecoveryInterestTerms: (newAnalysis.complianceChecklist || []).some(item => 
          (item.item.toLowerCase().includes('debt recovery') || 
           item.item.toLowerCase().includes('interest')) && item.status === 'Y'
        ),
        exteriorInteriorRedecorationObligations: (newAnalysis.complianceChecklist || []).some(item => 
          (item.item.toLowerCase().includes('exterior') || 
           item.item.toLowerCase().includes('interior') || 
           item.item.toLowerCase().includes('redecoration')) && item.status === 'Y'
        )
      },
      additionalInfo: {
        breakClause: '',
        forfeitureClause: '',
        disputeResolution: '',
        legalCosts: '',
        stampDuty: '',
        registrationRequirements: ''
      },
      metadata: {
        confidence: newAnalysis.confidence || 0.8,
        extractedDate: new Date().toISOString(),
        documentType: 'lease',
        analysisVersion: '2.0.0',
        warnings: [],
        notes: []
      }
    };
  } catch (error) {
    console.error('Legacy lease analysis error:', error);
    throw error;
  }
}

export async function analyzeLeaseDocument(
  extractedText: string, 
  filename: string,
  buildingId?: string
): Promise<LeaseAnalysis> {
  
  console.log('🔍 Starting lease analysis for:', filename);
  console.log('🔍 Text length:', extractedText.length);
  console.log('🔍 Building ID:', buildingId);
  console.log('🔍 Sample text (first 500 chars):', extractedText.substring(0, 500));
  
  // Enhanced prompt that works with or without building context
  const leasePrompt = `
You are analyzing a lease document for UK property management. Extract ALL available information and provide a comprehensive analysis.

DOCUMENT TEXT TO ANALYZE:
${extractedText}

IMPORTANT: Extract EVERY piece of information you can find. If information is not available, use "Not specified" or "Unknown".

Please provide a JSON response with this EXACT structure:

{
  "leaseSummary": "Detailed narrative summary of the lease",
  "structuredData": {
    "propertyAddress": "Full property address from lease",
    "landlord": "Landlord name",
    "tenant": "Tenant name", 
    "leaseStartDate": "Start date (e.g., '17th February 2017')",
    "leaseEndDate": "End date if specified",
    "leaseTerm": "Lease duration (e.g., '125 years', '10 years')",
    "premium": "Premium amount if specified",
    "initialRent": "Initial rent amount",
    "monthlyRent": "Monthly rent if specified",
    "annualRent": "Annual rent if specified",
    "serviceCharge": "Service charge amount or percentage",
    "deposit": "Deposit amount if specified",
    "buildingType": "Property type (flat, house, commercial, etc.)",
    "propertyDescription": "Property description from lease",
    "floorArea": "Floor area if specified"
  },
  "complianceChecklist": [
    {
      "item": "Term consent in favour of client",
      "status": "Y/N/Unknown",
      "details": "Specific details found in lease"
    }
  ],
  "financialObligations": [
    "List all financial responsibilities found in lease"
  ],
  "keyRights": [
    "List all tenant rights found in lease"
  ],
  "restrictions": [
    "List all restrictions and prohibitions found in lease"
  ],
  "suggestedActions": [
    "Add new building to portfolio if not found",
    "Update building records with lease details",
    "Review compliance requirements"
  ]
}

CRITICAL: Extract EVERY detail you can find. If the lease mentions "260 [Street Name]", extract that. If it mentions rent amounts, extract them. If it mentions dates, extract them. Be thorough and extract ALL information available.
  `;

  try {
    console.log('🔍 Sending request to OpenAI...');
    
    // Use OpenAI directly since we're in a server-side context
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: 'user', content: leasePrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const aiResult = completion.choices[0].message.content;
    if (!aiResult) {
      throw new Error('No response from OpenAI');
    }

    console.log('🔍 Raw AI response:', aiResult);

    const analysis = JSON.parse(aiResult);
    
    console.log('🔍 Parsed analysis:', {
      leaseSummary: analysis.leaseSummary,
      structuredData: analysis.structuredData,
      complianceChecklist: analysis.complianceChecklist,
      financialObligations: analysis.financialObligations,
      keyRights: analysis.keyRights,
      restrictions: analysis.restrictions
    });

    // Determine if we have building context
    const hasBuildingContext = buildingId && buildingId !== 'unknown';
    const buildingStatus: 'matched' | 'not_found' | 'unknown' = hasBuildingContext ? 'matched' : 'not_found';

    // Transform into LeaseAnalysis format with proper data mapping
    const result = {
      filename,
      summary: analysis.leaseSummary || analysis.summary || 'Lease document analyzed successfully',
      documentType: 'lease',
      leaseDetails: {
        propertyAddress: analysis.structuredData?.propertyAddress || null,
        landlord: analysis.structuredData?.landlord || null,
        tenant: analysis.structuredData?.tenant || null,
        leaseStartDate: analysis.structuredData?.leaseStartDate || null,
        leaseEndDate: analysis.structuredData?.leaseEndDate || null,
        leaseTerm: analysis.structuredData?.leaseTerm || null,
        premium: analysis.structuredData?.premium || null,
        initialRent: analysis.structuredData?.initialRent || null,
        monthlyRent: analysis.structuredData?.monthlyRent || null,
        annualRent: analysis.structuredData?.annualRent || null,
        serviceCharge: analysis.structuredData?.serviceCharge || null,
        deposit: analysis.structuredData?.deposit || null,
        buildingType: analysis.structuredData?.buildingType || null,
        propertyDescription: analysis.structuredData?.propertyDescription || null,
        floorArea: analysis.structuredData?.floorArea || null
      },
      complianceChecklist: analysis.complianceChecklist?.map((item: any) => ({
        item: item.name || item.item,
        status: item.status,
        details: item.details
      })) || [],
      financialObligations: analysis.financialObligations || [],
      keyRights: analysis.keyRights || [],
      restrictions: analysis.restrictions || [],
      suggestedActions: analysis.suggestedActions?.map((action: any, index: number) => ({
        key: `lease_action_${index}`,
        label: action.title || action.label || action,
        icon: 'FileText',
        action: action.action || 'review'
      })) || [],
      extractionMethod: 'ai_lease_analysis',
      confidence: 0.9,
      buildingContext: {
        buildingId: buildingId || null,
        buildingStatus,
        extractedAddress: analysis.structuredData?.propertyAddress || null,
        extractedBuildingType: analysis.structuredData?.buildingType || null
      }
    };

    console.log('🔍 Final result structure:', {
      leaseDetails: result.leaseDetails,
      complianceChecklist: result.complianceChecklist,
      financialObligations: result.financialObligations,
      keyRights: result.keyRights,
      restrictions: result.restrictions
    });

    return result;

  } catch (error) {
    console.error('❌ Lease analysis error:', error);
    
    // Fallback to basic analysis
    return {
      filename,
      summary: `Lease document analysis failed. Document contains ${extractedText.length} characters of text.`,
      documentType: 'lease',
      leaseDetails: {},
      complianceChecklist: LEASE_COMPLIANCE_CHECKLIST.map(item => ({
        item,
        status: 'Unknown' as const
      })),
      suggestedActions: [{
        key: 'manual_review',
        label: 'Manual lease review required',
        icon: 'AlertTriangle',
        action: 'review'
      }],
      extractionMethod: 'fallback',
      confidence: 0.1,
      buildingContext: {
        buildingId: buildingId || null,
        buildingStatus: 'unknown',
        extractedAddress: null,
        extractedBuildingType: null
      }
    };
  }
}
