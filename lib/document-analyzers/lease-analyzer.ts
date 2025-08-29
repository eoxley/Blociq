import { analyzeLease, LeaseAnalysis } from '@/lib/lease-analyzer';

export interface LeaseAnalysisResult {
  documentType: 'lease';
  filename: string;
  summary: string;
  keyDates: {
    description: string;
    date: string;
    type: 'start' | 'end' | 'review' | 'payment' | 'other';
  }[];
  actionItems: {
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: 'financial' | 'compliance' | 'maintenance' | 'legal';
    dueDate?: string;
  }[];
  riskAssessment: {
    overall: 'low' | 'medium' | 'high';
    factors: string[];
    mitigation: string[];
  };
  complianceStatus: 'compliant' | 'requires_review' | 'non_compliant' | 'unknown';
  extractedText: string;
  detailedAnalysis: LeaseAnalysis;
}

export async function analyzeLeaseDocument(
  extractedText: string,
  filename: string
): Promise<LeaseAnalysisResult> {
  try {
    // Use the existing lease analyzer
    const leaseAnalysis = await analyzeLease(extractedText, {
      includeComplianceChecklist: true,
      extractFinancialDetails: true,
      analyzeServiceProvisions: true
    });

    // Extract key dates from the analysis
    const keyDates = [];
    if (leaseAnalysis.propertyDetails?.startDate) {
      keyDates.push({
        description: 'Lease Start Date',
        date: leaseAnalysis.propertyDetails.startDate,
        type: 'start' as const
      });
    }
    if (leaseAnalysis.propertyDetails?.endDate) {
      keyDates.push({
        description: 'Lease End Date',
        date: leaseAnalysis.propertyDetails.endDate,
        type: 'end' as const
      });
    }
    if (leaseAnalysis.financialObligations?.rentReviewDate) {
      keyDates.push({
        description: 'Next Rent Review',
        date: leaseAnalysis.financialObligations.rentReviewDate,
        type: 'review' as const
      });
    }
    if (leaseAnalysis.financialObligations?.serviceChargeReviewDate) {
      keyDates.push({
        description: 'Service Charge Review',
        date: leaseAnalysis.financialObligations.serviceChargeReviewDate,
        type: 'review' as const
      });
    }

    // Generate action items based on compliance checklist
    const actionItems = [];
    const checklist = leaseAnalysis.complianceChecklist || {};
    
    // High priority items
    if (!checklist.termConsentInFavourOfClient) {
      actionItems.push({
        description: 'Review Term Consent provisions - may need legal advice',
        priority: 'high' as const,
        category: 'legal' as const
      });
    }
    
    if (!checklist.reserveFund) {
      actionItems.push({
        description: 'Establish reserve fund provisions for major works',
        priority: 'high' as const,
        category: 'financial' as const
      });
    }

    if (!checklist.windowsPipesHeatingProvisions) {
      actionItems.push({
        description: 'Clarify maintenance responsibilities for windows, pipes, and heating',
        priority: 'high' as const,
        category: 'maintenance' as const
      });
    }

    // Medium priority items
    if (!checklist.parkingRights) {
      actionItems.push({
        description: 'Define parking rights and restrictions',
        priority: 'medium' as const,
        category: 'compliance' as const
      });
    }

    if (!checklist.rightOfAccess) {
      actionItems.push({
        description: 'Establish right of access for maintenance and inspections',
        priority: 'medium' as const,
        category: 'compliance' as const
      });
    }

    if (!checklist.tvAssignmentAlterationsClauses) {
      actionItems.push({
        description: 'Review TV licence, assignment, and alteration clauses',
        priority: 'medium' as const,
        category: 'legal' as const
      });
    }

    // Low priority items
    if (!checklist.noticeRequirements) {
      actionItems.push({
        description: 'Clarify notice requirements for various actions',
        priority: 'low' as const,
        category: 'compliance' as const
      });
    }

    if (!checklist.subletPetsPermissions) {
      actionItems.push({
        description: 'Define subletting and pet permissions',
        priority: 'low' as const,
        category: 'compliance' as const
      });
    }

    if (!checklist.debtRecoveryInterestTerms) {
      actionItems.push({
        description: 'Establish debt recovery and interest terms',
        priority: 'low' as const,
        category: 'financial' as const
      });
    }

    if (!checklist.exteriorInteriorRedecorationObligations) {
      actionItems.push({
        description: 'Clarify exterior and interior redecoration obligations',
        priority: 'low' as const,
        category: 'maintenance' as const
      });
    }

    // Assess overall risk
    const riskFactors = [];
    const mitigation = [];
    
    if (actionItems.filter(item => item.priority === 'high').length > 3) {
      riskFactors.push('Multiple high-priority compliance gaps identified');
      mitigation.push('Prioritize legal review and compliance updates');
    }
    
    if (!checklist.termConsentInFavourOfClient) {
      riskFactors.push('Term consent provisions may be insufficient');
      mitigation.push('Seek legal advice on term consent requirements');
    }
    
    if (!checklist.reserveFund) {
      riskFactors.push('No reserve fund provisions for major works');
      mitigation.push('Establish reserve fund policy and contributions');
    }

    const overallRisk = riskFactors.length > 2 ? 'high' : 
                       riskFactors.length > 0 ? 'medium' : 'low';

    // Determine compliance status
    let complianceStatus: 'compliant' | 'requires_review' | 'non_compliant' | 'unknown' = 'unknown';
    const totalChecklistItems = Object.keys(checklist).length;
    const compliantItems = Object.values(checklist).filter(Boolean).length;
    const compliancePercentage = (compliantItems / totalChecklistItems) * 100;

    if (compliancePercentage >= 80) {
      complianceStatus = 'compliant';
    } else if (compliancePercentage >= 60) {
      complianceStatus = 'requires_review';
    } else {
      complianceStatus = 'non_compliant';
    }

    // Generate summary
    const leaseTerm = leaseAnalysis.propertyDetails?.leaseTerm || 'standard';
    const summary = `Lease analysis for ${filename} reveals a ${leaseTerm} lease with ${compliancePercentage.toFixed(0)}% compliance coverage. ${actionItems.length} action items identified requiring attention.`;

    return {
      documentType: 'lease',
      filename,
      summary,
      keyDates,
      actionItems,
      riskAssessment: {
        overall: overallRisk,
        factors: riskFactors,
        mitigation
      },
      complianceStatus,
      extractedText,
      detailedAnalysis: leaseAnalysis
    };

  } catch (error) {
    console.error('❌ Lease analysis failed:', error);
    
    // Return error result
    return {
      documentType: 'lease',
      filename,
      summary: `Failed to analyze lease document: ${error instanceof Error ? error.message : 'Unknown error'}`,
      keyDates: [],
      actionItems: [],
      riskAssessment: {
        overall: 'unknown',
        factors: ['Analysis failed'],
        mitigation: ['Re-run analysis or check document quality']
      },
      complianceStatus: 'unknown',
      extractedText,
      detailedAnalysis: {} as LeaseAnalysis
    };
  }
}
