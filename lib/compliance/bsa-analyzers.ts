/**
 * Building Safety Act (BSA) Compliance Analyzers
 * Modular analyzers for different compliance document types with hybrid AI + rules logic
 */

export type BSAComplianceStatus =
  | 'compliant'
  | 'non_compliant'
  | 'remedial_action_pending'
  | 'expired'
  | 'scheduled'
  | 'under_review'
  | 'pending'
  | 'overdue'
  | 'upcoming';

export type BSAPriority = 'high' | 'medium' | 'low';

export interface BSAAnalysisResult {
  status: BSAComplianceStatus;
  priority: BSAPriority;
  findings: string[];
  actionRequired: string | null;
  riskLevel: 'intolerable' | 'tolerable' | 'broadly_acceptable' | 'unknown';
  complianceDetails: {
    category1Issues?: number;
    category2Issues?: number;
    intolerableRisks?: string[];
    urgentActions?: string[];
    remedialWorks?: string[];
  };
  contractorRecommendations?: string[];
  regulatoryNotes?: string[];
}

/**
 * EICR (Electrical Installation Condition Report) Analyzer
 */
export class EICRAnalyzer {
  static analyze(text: string, aiSummary: any): BSAAnalysisResult {
    const normalizedText = text.toLowerCase();
    const findings: string[] = [];
    let status: BSAComplianceStatus = 'compliant';
    let priority: BSAPriority = 'low';
    let riskLevel: 'intolerable' | 'tolerable' | 'broadly_acceptable' | 'unknown' = 'unknown';

    // Category 1 (C1) Detection - Critical/Dangerous
    const c1Patterns = [
      /category\s*1[:\s]*(\d+)/gi,
      /c1[:\s]*(\d+)/gi,
      /(\d+)\s*category\s*1/gi,
      /danger\s*present/gi,
      /immediate\s*danger/gi
    ];

    let category1Count = 0;
    for (const pattern of c1Patterns) {
      const matches = [...normalizedText.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          category1Count += parseInt(match[1]) || 0;
        } else if (match[0].includes('danger')) {
          category1Count = 1; // Danger present = at least 1 C1
        }
      }
    }

    // Category 2 (C2) Detection - Potentially Dangerous
    const c2Patterns = [
      /category\s*2[:\s]*(\d+)/gi,
      /c2[:\s]*(\d+)/gi,
      /(\d+)\s*category\s*2/gi,
      /potentially\s*dangerous/gi
    ];

    let category2Count = 0;
    for (const pattern of c2Patterns) {
      const matches = [...normalizedText.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          category2Count += parseInt(match[1]) || 0;
        }
      }
    }

    // Determine status based on findings
    if (category1Count > 0) {
      status = 'non_compliant';
      priority = 'high';
      riskLevel = 'intolerable';
      findings.push(`${category1Count} Category 1 defect(s) found - immediate action required`);
    } else if (category2Count > 0) {
      status = 'remedial_action_pending';
      priority = 'medium';
      riskLevel = 'tolerable';
      findings.push(`${category2Count} Category 2 defect(s) found - remedial action required`);
    } else if (normalizedText.includes('no category 1') || normalizedText.includes('no c1')) {
      status = 'compliant';
      priority = 'low';
      riskLevel = 'broadly_acceptable';
      findings.push('No Category 1 issues found - installation satisfactory');
    }

    // Check for specific EICR failure terms
    const failureTerms = [
      'unsatisfactory', 'fail', 'failed', 'non-compliant',
      'immediate attention', 'urgent remedial', 'cease use'
    ];

    for (const term of failureTerms) {
      if (normalizedText.includes(term)) {
        status = 'non_compliant';
        priority = 'high';
        riskLevel = 'intolerable';
        findings.push(`EICR marked as ${term}`);
        break;
      }
    }

    const actionRequired = status !== 'compliant'
      ? `Address ${category1Count} Category 1 and ${category2Count} Category 2 defects immediately`
      : null;

    return {
      status,
      priority,
      findings,
      actionRequired,
      riskLevel,
      complianceDetails: {
        category1Issues: category1Count,
        category2Issues: category2Count,
        urgentActions: category1Count > 0 ? [`Rectify ${category1Count} Category 1 defects`] : [],
        remedialWorks: category2Count > 0 ? [`Address ${category2Count} Category 2 observations`] : []
      }
    };
  }
}

/**
 * FRA/FRAEW (Fire Risk Assessment) Analyzer
 */
export class FRAAnalyzer {
  static analyze(text: string, aiSummary: any): BSAAnalysisResult {
    const normalizedText = text.toLowerCase();
    const findings: string[] = [];
    let status: BSAComplianceStatus = 'compliant';
    let priority: BSAPriority = 'low';
    let riskLevel: 'intolerable' | 'tolerable' | 'broadly_acceptable' | 'unknown' = 'unknown';

    // Intolerable risk detection
    const intolerableRiskPatterns = [
      /intolerable\s*risk/gi,
      /immediate\s*risk/gi,
      /high\s*risk.*immediate/gi,
      /cease\s*use/gi,
      /evacuate/gi,
      /serious\s*fire\s*risk/gi
    ];

    const intolerableRisks: string[] = [];
    for (const pattern of intolerableRiskPatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        intolerableRisks.push(match[0]);
        status = 'non_compliant';
        priority = 'high';
        riskLevel = 'intolerable';
      }
    }

    // Requires intrusive survey
    if (normalizedText.includes('requires intrusive survey') ||
        normalizedText.includes('intrusive investigation required')) {
      status = 'remedial_action_pending';
      priority = 'medium';
      riskLevel = 'tolerable';
      findings.push('Intrusive survey required');
    }

    // High/Medium risk requiring action
    const mediumRiskPatterns = [
      /high\s*risk/gi,
      /medium\s*risk.*action/gi,
      /significant\s*risk/gi,
      /remedial\s*action\s*required/gi
    ];

    for (const pattern of mediumRiskPatterns) {
      if (pattern.test(normalizedText) && status === 'compliant') {
        status = 'remedial_action_pending';
        priority = 'medium';
        riskLevel = 'tolerable';
        findings.push('Medium/High risk areas requiring action');
      }
    }

    // Satisfactory/Low risk
    if (normalizedText.includes('low risk') ||
        normalizedText.includes('tolerable risk') ||
        normalizedText.includes('satisfactory')) {
      if (status === 'compliant') {
        riskLevel = 'broadly_acceptable';
        findings.push('Fire risk assessment satisfactory - low/tolerable risk');
      }
    }

    const actionRequired = status !== 'compliant'
      ? intolerableRisks.length > 0
        ? 'Immediate action required for intolerable fire risks'
        : 'Address identified fire safety concerns'
      : null;

    return {
      status,
      priority,
      findings,
      actionRequired,
      riskLevel,
      complianceDetails: {
        intolerableRisks,
        urgentActions: intolerableRisks.length > 0 ? ['Address intolerable fire risks immediately'] : [],
        remedialWorks: status === 'remedial_action_pending' ? ['Complete recommended fire safety improvements'] : []
      },
      regulatoryNotes: intolerableRisks.length > 0 ? ['Report to Fire Authority if required under RRO'] : []
    };
  }
}

/**
 * Lift Maintenance Report Analyzer
 */
export class LiftAnalyzer {
  static analyze(text: string, aiSummary: any): BSAAnalysisResult {
    const normalizedText = text.toLowerCase();
    const findings: string[] = [];
    let status: BSAComplianceStatus = 'compliant';
    let priority: BSAPriority = 'low';
    let riskLevel: 'intolerable' | 'tolerable' | 'broadly_acceptable' | 'unknown' = 'unknown';

    // Critical failure detection
    const criticalFailures = [
      /condemned/gi,
      /out\s*of\s*service/gi,
      /immediate\s*shutdown/gi,
      /unsafe\s*to\s*operate/gi,
      /emergency\s*stop/gi,
      /safety\s*critical\s*fault/gi
    ];

    for (const pattern of criticalFailures) {
      if (pattern.test(normalizedText)) {
        status = 'non_compliant';
        priority = 'high';
        riskLevel = 'intolerable';
        findings.push(`Lift condemned/out of service: ${pattern.source}`);
      }
    }

    // Requires repair/maintenance
    const repairRequired = [
      /repair\s*required/gi,
      /maintenance\s*overdue/gi,
      /defect\s*found/gi,
      /adjustment\s*needed/gi
    ];

    for (const pattern of repairRequired) {
      if (pattern.test(normalizedText) && status === 'compliant') {
        status = 'remedial_action_pending';
        priority = 'medium';
        riskLevel = 'tolerable';
        findings.push('Lift requires maintenance/repair');
      }
    }

    // Passed/Satisfactory
    if (normalizedText.includes('passed') ||
        normalizedText.includes('satisfactory') ||
        normalizedText.includes('safe to operate')) {
      if (status === 'compliant') {
        riskLevel = 'broadly_acceptable';
        findings.push('Lift inspection passed - safe to operate');
      }
    }

    const actionRequired = status !== 'compliant'
      ? status === 'non_compliant'
        ? 'Immediate lift shutdown and repair required'
        : 'Schedule lift maintenance/repair'
      : null;

    return {
      status,
      priority,
      findings,
      actionRequired,
      riskLevel,
      complianceDetails: {
        urgentActions: status === 'non_compliant' ? ['Immediate lift shutdown required'] : [],
        remedialWorks: status === 'remedial_action_pending' ? ['Schedule lift repair/maintenance'] : []
      },
      contractorRecommendations: status !== 'compliant' ? ['Contact qualified lift engineer'] : []
    };
  }
}

/**
 * Gas Safety Record Analyzer
 */
export class GasSafetyAnalyzer {
  static analyze(text: string, aiSummary: any): BSAAnalysisResult {
    const normalizedText = text.toLowerCase();
    const findings: string[] = [];
    let status: BSAComplianceStatus = 'compliant';
    let priority: BSAPriority = 'low';
    let riskLevel: 'intolerable' | 'tolerable' | 'broadly_acceptable' | 'unknown' = 'unknown';

    // Immediate danger detection
    const immediateDangers = [
      /immediate\s*danger/gi,
      /immediately\s*dangerous/gi,
      /id\s*-\s*immediate/gi,
      /gas\s*leak/gi,
      /carbon\s*monoxide\s*detected/gi,
      /unsafe\s*appliance/gi
    ];

    for (const pattern of immediateDangers) {
      if (pattern.test(normalizedText)) {
        status = 'non_compliant';
        priority = 'high';
        riskLevel = 'intolerable';
        findings.push('Immediate danger detected - gas supply isolated');
      }
    }

    // At risk/Not to current standards
    const atRiskPatterns = [
      /at\s*risk/gi,
      /ar\s*-\s*at\s*risk/gi,
      /not\s*to\s*current\s*standards/gi,
      /ntcs/gi,
      /defect\s*found/gi
    ];

    for (const pattern of atRiskPatterns) {
      if (pattern.test(normalizedText) && status === 'compliant') {
        status = 'remedial_action_pending';
        priority = 'medium';
        riskLevel = 'tolerable';
        findings.push('Gas appliance at risk or not to current standards');
      }
    }

    // Passed/Safe
    if (normalizedText.includes('safe') ||
        normalizedText.includes('passed') ||
        normalizedText.includes('satisfactory')) {
      if (status === 'compliant') {
        riskLevel = 'broadly_acceptable';
        findings.push('Gas safety check passed - all appliances safe');
      }
    }

    const actionRequired = status !== 'compliant'
      ? status === 'non_compliant'
        ? 'Immediate gas engineer callout required'
        : 'Schedule gas appliance repair/upgrade'
      : null;

    return {
      status,
      priority,
      findings,
      actionRequired,
      riskLevel,
      complianceDetails: {
        urgentActions: status === 'non_compliant' ? ['Immediate gas engineer attendance required'] : [],
        remedialWorks: status === 'remedial_action_pending' ? ['Repair/upgrade gas appliances'] : []
      },
      contractorRecommendations: status !== 'compliant' ? ['Contact Gas Safe registered engineer'] : [],
      regulatoryNotes: status === 'non_compliant' ? ['Report to HSE if required'] : []
    };
  }
}

/**
 * Main BSA Compliance Analyzer - Routes to specific analyzers
 */
export class BSAComplianceAnalyzer {
  static analyze(
    documentType: string,
    extractedText: string,
    aiSummary: any,
    inspectionDate?: string,
    nextDueDate?: string
  ): BSAAnalysisResult {
    let result: BSAAnalysisResult;

    // Route to appropriate analyzer
    switch (documentType.toLowerCase()) {
      case 'eicr':
      case 'electrical installation condition report':
        result = EICRAnalyzer.analyze(extractedText, aiSummary);
        break;
      case 'fire risk assessment':
      case 'fra':
      case 'fraew':
        result = FRAAnalyzer.analyze(extractedText, aiSummary);
        break;
      case 'lift maintenance':
      case 'lift inspection':
      case 'lift service report':
        result = LiftAnalyzer.analyze(extractedText, aiSummary);
        break;
      case 'gas safety certificate':
      case 'gas safety record':
      case 'cp12':
        result = GasSafetyAnalyzer.analyze(extractedText, aiSummary);
        break;
      default:
        // Generic analyzer for other document types
        result = {
          status: 'under_review',
          priority: 'medium',
          findings: ['Document requires manual review'],
          actionRequired: 'Manual review required',
          riskLevel: 'unknown',
          complianceDetails: {}
        };
    }

    // Check for expiry
    if (nextDueDate) {
      const dueDate = new Date(nextDueDate);
      const today = new Date();

      if (dueDate < today) {
        result.status = 'expired';
        result.priority = 'high';
        result.findings.unshift('Document expired - renewal required immediately');
        result.actionRequired = 'Immediate renewal required - document expired';
      } else if (dueDate <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        // Due within 30 days
        if (result.status === 'compliant') {
          result.status = 'scheduled';
          result.findings.push('Renewal due within 30 days');
        }
      }
    }

    return result;
  }
}