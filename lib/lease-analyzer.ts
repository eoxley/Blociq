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
  
  // Enhanced prompt that works with or without building context
  const leasePrompt = `
You are analyzing a lease document for UK property management. Provide a comprehensive analysis in the following structure:

DOCUMENT ANALYSIS:
${extractedText}

Please extract and analyze:

1. **LEASE SUMMARY** - Provide a detailed narrative summary including:
   - Property address and description
   - Landlord and tenant names
   - Lease term dates and duration
   - Financial details (premium, rent, service charges)
   - Key rights and restrictions
   - Service provisions

2. **STRUCTURED DATA** - Extract specific details:
   - Property address (full address if possible)
   - Landlord name
   - Tenant name
   - Lease start/end dates
   - Lease term (e.g., "125 years")
   - Premium amount
   - Initial rent amount
   - Service charge percentage
   - Building type (flat, house, commercial, etc.)
   - Property description

3. **COMPLIANCE CHECKLIST** - For each item below, respond Y/N/Unknown and provide brief details if found:
   ${LEASE_COMPLIANCE_CHECKLIST.map(item => `- ${item}`).join('\n   ')}

4. **FINANCIAL OBLIGATIONS** - List all financial responsibilities

5. **KEY RIGHTS** - List tenant rights and entitlements

6. **RESTRICTIONS** - List prohibitions and limitations

7. **SUGGESTED ACTIONS** - Provide 3-5 actionable next steps for the property manager, including:
   - If building is not in system: "Add new building to portfolio"
   - If building exists: "Update building records with lease details"
   - General compliance actions based on lease terms

8. **BUILDING IDENTIFICATION** - If you can identify a specific building or address, note it clearly

Format the response as structured JSON.
  `;

  try {
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

    const analysis = JSON.parse(aiResult);

    // Determine if we have building context
    const hasBuildingContext = buildingId && buildingId !== 'unknown';
    const buildingStatus = hasBuildingContext ? 'matched' : 'not_found';

    // Transform into LeaseAnalysis format
    return {
      filename,
      summary: analysis.leaseSummary || analysis.summary || 'Lease document analyzed successfully',
      documentType: 'lease',
      leaseDetails: analysis.structuredData || {},
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

  } catch (error) {
    console.error('Lease analysis error:', error);
    
    // Fallback to basic analysis
    return {
      filename,
      summary: `Lease document analysis failed. Document contains ${extractedText.length} characters of text.`,
      documentType: 'lease',
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
