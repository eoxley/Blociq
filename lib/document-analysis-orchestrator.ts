
import { classifyDocument, DocumentType } from './document-classifier';
import { analyzeEICR, EICRAnalysis } from './document-analyzers/eicr-analyzer';
import { analyzeGasSafety, GasSafetyAnalysis } from './document-analyzers/gas-safety-analyzer';
import { analyzeFireRiskAssessment, FireRiskAssessmentAnalysis } from './document-analyzers/fire-assessment-analyzer';
import { analyzeMajorWorks, MajorWorksAnalysis } from './document-analyzers/major-works-analyzer';
import { analyzeSection20, Section20Analysis } from './document-analyzers/section20-analyzer';
import { analyzeAsbestosSurvey, AsbestosSurveyAnalysis } from './document-analyzers/asbestos-survey-analyzer';
import { analyzeLiftInspection, LiftInspectionAnalysis } from './document-analyzers/lift-inspection-analyzer';
import { analyzeInsuranceValuation, InsuranceValuationAnalysis } from './document-analyzers/insurance-valuation-analyzer';
import { analyzeBuildingSurvey, BuildingSurveyAnalysis } from './document-analyzers/building-survey-analyzer';
import { analyzeLeaseDocument, LeaseAnalysisResult } from './document-analyzers/lease-analyzer';
import { analyzeGeneralDocument, GeneralDocumentAnalysis } from './document-analyzers/general-analyzer';

export type DocumentAnalysis = 
  | EICRAnalysis 
  | GasSafetyAnalysis 
  | FireRiskAssessmentAnalysis 
  | MajorWorksAnalysis
  | Section20Analysis
  | AsbestosSurveyAnalysis
  | LiftInspectionAnalysis
  | InsuranceValuationAnalysis
  | BuildingSurveyAnalysis
  | GeneralDocumentAnalysis;

export interface ComprehensiveDocumentAnalysis {
  documentType: DocumentType;
  filename: string;
  classification: {
    type: DocumentType;
    confidence: number;
    keywords: string[];
    reasoning: string;
  };
  analysis: DocumentAnalysis;
  summary: string;
  complianceStatus: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
  keyDates: {
    issueDate: string | null;
    expiryDate: string | null;
    nextReviewDate: string | null;
    deadlines: string[];
  };
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    completed: string[];
  };
  riskAssessment: {
    overall: 'low' | 'medium' | 'high' | 'unknown';
    factors: string[];
    mitigation: string[];
  };
  legalRequirements: {
    regulations: string[];
    obligations: string[];
    penalties: string[];
    deadlines: string[];
  };
  recommendations: string[];
  nextSteps: string[];
  extractedText: string;
  aiPrompt: string;
}

/**
 * Orchestrate comprehensive document analysis
 */
export async function analyzeDocument(
  extractedText: string, 
  filename: string, 
  originalMessage: string
): Promise<ComprehensiveDocumentAnalysis> {
  
  // Step 1: Classify the document
  const classification = classifyDocument(extractedText, filename);
  
  // Step 2: Route to appropriate analyzer
  const analysis = await routeToAnalyzer(classification.type, extractedText, filename);
  
  // Step 3: Generate comprehensive analysis
  const comprehensive = generateComprehensiveAnalysis(
    classification,
    analysis,
    filename,
    originalMessage,
    extractedText
  );
  
  return comprehensive;
}

/**
 * Route document to appropriate specialist analyzer
 */
async function routeToAnalyzer(
  docType: DocumentType, 
  extractedText: string, 
  filename: string
): Promise<DocumentAnalysis> {
  
  switch (docType) {
    case 'eicr':
      return analyzeEICR(extractedText, filename);
      
    case 'gas-safety':
      return analyzeGasSafety(extractedText, filename);
      
    case 'fire-risk-assessment':
      return analyzeFireRiskAssessment(extractedText, filename);
      
    case 'lease':
      // Lease documents use the existing enhanced prompt system
      return analyzeGeneralDocument(extractedText, filename);
      
    case 'major-works':
      return analyzeMajorWorks(extractedText, filename);
      
    case 'section20':
      return analyzeSection20(extractedText, filename);
      
    case 'asbestos-survey':
      return analyzeAsbestosSurvey(extractedText, filename);
      
    case 'lift-inspection':
      return analyzeLiftInspection(extractedText, filename);
      
    case 'insurance-valuation':
      return analyzeInsuranceValuation(extractedText, filename);
      
    case 'building-survey':
      return analyzeBuildingSurvey(extractedText, filename);
      
    case 'other':
    default:
      return analyzeGeneralDocument(extractedText, filename);
  }
}

/**
 * Generate comprehensive analysis combining classification and specialist analysis
 */
function generateComprehensiveAnalysis(
  classification: { type: DocumentType; confidence: number; keywords: string[]; reasoning: string },
  analysis: DocumentAnalysis,
  filename: string,
  originalMessage: string,
  extractedText: string
): ComprehensiveDocumentAnalysis {
  
  // Extract common fields from analysis
  const summary = analysis.summary;
  const complianceStatus = analysis.complianceStatus;
  
  // Extract key dates (common across most document types)
  const keyDates = extractKeyDates(analysis);
  
  // Extract action items (common across most document types)
  const actionItems = extractActionItems(analysis);
  
  // Extract risk assessment (common across most document types)
  const riskAssessment = extractRiskAssessment(analysis);
  
  // Extract legal requirements (common across most document types)
  const legalRequirements = extractLegalRequirements(analysis);
  
  // Extract recommendations (common across most document types)
  const recommendations = extractRecommendations(analysis);
  
  // Generate next steps
  const nextSteps = generateNextSteps(analysis, classification);
  
  // Generate AI prompt
  const aiPrompt = generateAIPrompt(
    analysis,
    classification,
    originalMessage,
    extractedText,
    filename
  );
  
  return {
    documentType: classification.type,
    filename,
    classification,
    analysis,
    summary,
    complianceStatus,
    keyDates,
    actionItems,
    riskAssessment,
    legalRequirements,
    recommendations,
    nextSteps,
    extractedText,
    aiPrompt
  };
}

/**
 * Extract key dates from analysis
 */
function extractKeyDates(analysis: DocumentAnalysis): {
  issueDate: string | null;
  expiryDate: string | null;
  nextReviewDate: string | null;
  deadlines: string[];
} {
  // Extract dates based on document type
  switch (analysis.documentType) {
    case 'eicr':
      return {
        issueDate: null,
        expiryDate: null,
        nextReviewDate: analysis.nextTestDue,
        deadlines: []
      };
      
    case 'gas-safety':
      return {
        issueDate: null,
        expiryDate: null,
        nextReviewDate: analysis.nextInspectionDate,
        deadlines: []
      };
      
    case 'fire-risk-assessment':
      return {
        issueDate: analysis.reviewDate,
        expiryDate: null,
        nextReviewDate: analysis.nextReviewDate,
        deadlines: []
      };
      
    case 'major-works':
      return {
        issueDate: analysis.timeline.startDate,
        expiryDate: null,
        nextReviewDate: analysis.timeline.completionDate,
        deadlines: analysis.consultationRequirements.responseDeadlines
      };
      
    case 'other':
    default:
      return analysis.keyDates;
  }
}

/**
 * Extract action items from analysis
 */
function extractActionItems(analysis: DocumentAnalysis): {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
  completed: string[];
} {
  switch (analysis.documentType) {
    case 'eicr':
      return analysis.actionItems;
      
    case 'gas-safety':
      return analysis.actionItems;
      
    case 'fire-risk-assessment':
      return analysis.actionItems;
      
    case 'major-works':
      return analysis.actionItems;
      
    case 'other':
    default:
      return analysis.actionItems;
  }
}

/**
 * Extract risk assessment from analysis
 */
function extractRiskAssessment(analysis: DocumentAnalysis): {
  overall: 'low' | 'medium' | 'high' | 'unknown';
  factors: string[];
  mitigation: string[];
} {
  switch (analysis.documentType) {
    case 'eicr':
      return {
        overall: analysis.riskAssessment.overall,
        factors: analysis.riskAssessment.factors,
        mitigation: []
      };
      
    case 'gas-safety':
      return {
        overall: 'unknown',
        factors: [],
        mitigation: []
      };
      
    case 'fire-risk-assessment':
      return {
        overall: analysis.riskRating.overall,
        factors: analysis.riskRating.factors,
        mitigation: []
      };
      
    case 'major-works':
      return {
        overall: analysis.riskAssessment.overall,
        factors: analysis.riskAssessment.factors,
        mitigation: analysis.riskAssessment.mitigation
      };
      
    case 'other':
    default:
      return analysis.riskAssessment;
  }
}

/**
 * Extract legal requirements from analysis
 */
function extractLegalRequirements(analysis: DocumentAnalysis): {
  regulations: string[];
  obligations: string[];
  penalties: string[];
  deadlines: string[];
} {
  switch (analysis.documentType) {
    case 'eicr':
      return {
        regulations: analysis.standards.otherStandards,
        obligations: [],
        penalties: [],
        deadlines: []
      };
      
    case 'gas-safety':
      return {
        regulations: analysis.complianceNotes,
        obligations: [],
        penalties: [],
        deadlines: []
      };
      
    case 'fire-risk-assessment':
      return {
        regulations: [],
        obligations: [],
        penalties: [],
        deadlines: []
      };
      
    case 'major-works':
      return {
        regulations: analysis.statutoryRequirements.other,
        obligations: [],
        penalties: [],
        deadlines: analysis.consultationRequirements.responseDeadlines
      };
      
    case 'other':
    default:
      return analysis.legalRequirements;
  }
}

/**
 * Extract recommendations from analysis
 */
function extractRecommendations(analysis: DocumentAnalysis): string[] {
  switch (analysis.documentType) {
    case 'eicr':
      return analysis.recommendations;
      
    case 'gas-safety':
      return analysis.recommendations;
      
    case 'fire-risk-assessment':
      return analysis.recommendations;
      
    case 'major-works':
      return analysis.recommendations;
      
    case 'other':
    default:
      return analysis.recommendations;
  }
}

/**
 * Generate next steps based on analysis and classification
 */
function generateNextSteps(
  analysis: DocumentAnalysis, 
  classification: { type: DocumentType; confidence: number; keywords: string[]; reasoning: string }
): string[] {
  const nextSteps: string[] = [];
  
  // Add document-specific next steps
  switch (analysis.documentType) {
    case 'eicr':
      if (analysis.remedialActions.required) {
        nextSteps.push('Complete required remedial actions within specified timeframe');
      }
      if (analysis.nextTestDue) {
        nextSteps.push(`Schedule next EICR inspection before ${analysis.nextTestDue}`);
      }
      break;
      
    case 'gas-safety':
      if (analysis.remedialActions.required) {
        nextSteps.push('Complete required remedial actions within specified timeframe');
      }
      if (analysis.nextInspectionDate) {
        nextSteps.push(`Schedule next gas safety inspection before ${analysis.nextInspectionDate}`);
      }
      break;
      
    case 'fire-risk-assessment':
      if (analysis.actionPlan.priority1.length > 0) {
        nextSteps.push('Implement priority 1 actions immediately');
      }
      if (analysis.nextReviewDate) {
        nextSteps.push(`Schedule next fire risk assessment before ${analysis.nextReviewDate}`);
      }
      break;
      
    case 'major-works':
      if (analysis.consultationRequirements.section20) {
        nextSteps.push('Complete Section 20 consultation process');
      }
      if (analysis.timeline.startDate) {
        nextSteps.push(`Prepare for project start on ${analysis.timeline.startDate}`);
      }
      break;
      
    case 'other':
    default:
      nextSteps.push(...analysis.nextSteps);
      break;
  }
  
  // Add general next steps
  nextSteps.push('Document all actions taken and outcomes');
  nextSteps.push('Monitor progress and update stakeholders');
  nextSteps.push('Schedule regular reviews to ensure ongoing compliance');
  
  return nextSteps;
}

/**
 * Generate AI prompt for the document
 */
function generateAIPrompt(
  analysis: DocumentAnalysis,
  classification: { type: DocumentType; confidence: number; keywords: string[]; reasoning: string },
  originalMessage: string,
  extractedText: string,
  filename: string
): string {
  const docType = classification.type;
  
  if (docType === 'lease') {
    return `You are a leasehold property management assistant. Analyse the following residential lease and extract:
- Property details (address, term, parties)
- Financial terms (rent, review dates, service charge %)
- Repair responsibilities
- Rights and restrictions
- Clauses: subletting, assignment, alterations
- Compliance summary (Y/N): Pets / Subletting / Reserve Fund / Windows / Heating / Access / Redecoration / Interest on arrears

Lease text:
${extractedText}

Original Question: ${originalMessage}`;
  }
  
  const docTypeDescription = getDocumentTypeDescription(docType);
  
  const prompt = `You are analyzing a ${docTypeDescription} for a UK leasehold block management platform called BlocIQ.

Document: ${filename}
Original User Question: ${originalMessage}

Please provide a comprehensive analysis of this document including:

1. DOCUMENT SUMMARY:
   ${analysis.summary}

2. COMPLIANCE STATUS:
   Overall Status: ${analysis.complianceStatus}
   ${getComplianceDetails(analysis)}

3. KEY DATES AND DEADLINES:
   ${getDatesSummary(analysis)}

4. ACTION ITEMS REQUIRED:
   ${getActionItemsSummary(analysis)}

5. RISK ASSESSMENT:
   ${getRiskSummary(analysis)}

6. LEGAL AND REGULATORY REQUIREMENTS:
   ${getLegalRequirementsSummary(analysis)}

7. RECOMMENDATIONS:
   ${getRecommendationsSummary(analysis)}

8. NEXT STEPS:
   ${getNextStepsSummary(analysis)}

Please format your response clearly with these sections and provide specific details from the document where possible. Focus on UK property management regulations and compliance requirements.

Document Content:
${extractedText}`;

  return prompt;
}

/**
 * Get compliance details for AI prompt
 */
function getComplianceDetails(analysis: DocumentAnalysis): string {
  switch (analysis.documentType) {
    case 'eicr':
      return `Test Results: ${analysis.testResults.overall}
Remedial Actions: ${analysis.remedialActions.required ? 'Required' : 'Not Required'}
Standards: ${analysis.standards.bs7671 ? 'BS 7671' : 'Other'} ${analysis.standards.otherStandards.join(', ')}`;
      
    case 'gas-safety':
      return `Appliance Checks: ${analysis.applianceChecks.satisfactory} satisfactory, ${analysis.applianceChecks.unsatisfactory} unsatisfactory
Flue Tests: ${analysis.flueTests.satisfactory} satisfactory, ${analysis.flueTests.unsatisfactory} unsatisfactory
Safety Features: ${Object.entries(analysis.safetyFeatures).filter(([_, value]) => value).map(([key, _]) => key).join(', ')}`;
      
    case 'fire-risk-assessment':
      return `Risk Rating: ${analysis.riskRating.overall}
Compliance Areas: ${analysis.complianceDetails.areas.join(', ')}
Gaps: ${analysis.complianceDetails.gaps.join(', ')}`;
      
    case 'major-works':
      return `Section 20 Consultation: ${analysis.consultationRequirements.section20 ? 'Required' : 'Not Required'}
Project Scope: ${analysis.projectScope.type.join(', ')}
Statutory Requirements: ${analysis.statutoryRequirements.planningPermission ? 'Planning Permission' : ''} ${analysis.statutoryRequirements.buildingRegulations ? 'Building Regulations' : ''}`;
      
    case 'other':
    default:
      return `Compliance Areas: ${analysis.complianceDetails.areas.join(', ')}
Gaps: ${analysis.complianceDetails.gaps.join(', ')}`;
  }
}

/**
 * Get dates summary for AI prompt
 */
function getDatesSummary(analysis: DocumentAnalysis): string {
  const dates = extractKeyDates(analysis);
  let summary = '';
  
  if (dates.issueDate) summary += `Issue Date: ${dates.issueDate}\n`;
  if (dates.expiryDate) summary += `Expiry Date: ${dates.expiryDate}\n`;
  if (dates.nextReviewDate) summary += `Next Review: ${dates.nextReviewDate}\n`;
  if (dates.deadlines.length > 0) summary += `Deadlines: ${dates.deadlines.join(', ')}\n`;
  
  return summary || 'No specific dates identified';
}

/**
 * Get action items summary for AI prompt
 */
function getActionItemsSummary(analysis: DocumentAnalysis): string {
  const actions = extractActionItems(analysis);
  let summary = '';
  
  if (actions.immediate.length > 0) summary += `Immediate: ${actions.immediate.join(', ')}\n`;
  if (actions.shortTerm.length > 0) summary += `Short Term: ${actions.shortTerm.join(', ')}\n`;
  if (actions.longTerm.length > 0) summary += `Long Term: ${actions.longTerm.join(', ')}\n`;
  if (actions.completed.length > 0) summary += `Completed: ${actions.completed.join(', ')}\n`;
  
  return summary || 'No specific action items identified';
}

/**
 * Get risk summary for AI prompt
 */
function getRiskSummary(analysis: DocumentAnalysis): string {
  const risk = extractRiskAssessment(analysis);
  let summary = `Overall Risk: ${risk.overall}\n`;
  
  if (risk.factors.length > 0) summary += `Risk Factors: ${risk.factors.join(', ')}\n`;
  if (risk.mitigation.length > 0) summary += `Mitigation: ${risk.mitigation.join(', ')}\n`;
  
  return summary;
}

/**
 * Get legal requirements summary for AI prompt
 */
function getLegalRequirementsSummary(analysis: DocumentAnalysis): string {
  const legal = extractLegalRequirements(analysis);
  let summary = '';
  
  if (legal.regulations.length > 0) summary += `Regulations: ${legal.regulations.join(', ')}\n`;
  if (legal.obligations.length > 0) summary += `Obligations: ${legal.obligations.join(', ')}\n`;
  if (legal.penalties.length > 0) summary += `Penalties: ${legal.penalties.join(', ')}\n`;
  if (legal.deadlines.length > 0) summary += `Deadlines: ${legal.deadlines.join(', ')}\n`;
  
  return summary || 'No specific legal requirements identified';
}

/**
 * Get recommendations summary for AI prompt
 */
function getRecommendationsSummary(analysis: DocumentAnalysis): string {
  const recommendations = extractRecommendations(analysis);
  return recommendations.length > 0 ? recommendations.join(', ') : 'No specific recommendations identified';
}

/**
 * Get next steps summary for AI prompt
 */
function getNextStepsSummary(analysis: DocumentAnalysis): string {
  const nextSteps = generateNextSteps(analysis, { type: 'other', confidence: 0, keywords: [], reasoning: '' });
  return nextSteps.join(', ');
}

/**
 * Get document type description
 */
function getDocumentTypeDescription(docType: DocumentType): string {
  const descriptions: Record<DocumentType, string> = {
    'lease': 'Lease Agreement',
    'eicr': 'Electrical Installation Condition Report (EICR)',
    'gas-safety': 'Gas Safety Certificate',
    'fire-risk-assessment': 'Fire Risk Assessment',
    'major-works': 'Major Works Documentation',
    'section20': 'Section 20 Notice',
    'asbestos-survey': 'Asbestos Survey',
    'lift-inspection': 'Lift Inspection Report',
    'insurance-valuation': 'Insurance Valuation',
    'building-survey': 'Building Survey',
    'other': 'Property Management Document'
  };
  
  return descriptions[docType];
}
