export interface GeneralDocumentAnalysis {
  documentType: 'other';
  summary: string;
  overallComplianceStatus: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
  keyDates: {
    issueDate: string | null;
    expiryDate: string | null;
    nextReviewDate: string | null;
    deadlines: string[];
  };
  complianceDetails: {
    overall: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
    areas: string[];
    gaps: string[];
  };
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    completed: string[];
  };
  responsibleParties: {
    primary: string | null;
    secondary: string[];
    contractors: string[];
    consultants: string[];
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
}

/**
 * Analyze general property management document content
 */
export function analyzeGeneralDocument(extractedText: string, filename: string): GeneralDocumentAnalysis {
  const text = extractedText.toLowerCase();
  
  return {
    documentType: 'other',
    summary: generateGeneralSummary(text, filename),
    overallComplianceStatus: determineGeneralCompliance(text),
    keyDates: extractKeyDates(text),
    complianceDetails: assessComplianceStatus(text),
    actionItems: extractActionItems(text),
    responsibleParties: extractResponsibleParties(text),
    riskAssessment: assessGeneralRisk(text),
    legalRequirements: extractLegalRequirements(text),
    recommendations: extractGeneralRecommendations(text),
    nextSteps: determineNextSteps(text)
  };
}

function generateGeneralSummary(text: string, filename: string): string {
  const hasIssues = text.includes('issue') || text.includes('problem') || text.includes('defect');
  const hasActions = text.includes('action') || text.includes('required') || text.includes('must');
  const isCompliant = text.includes('compliant') || text.includes('satisfactory') || text.includes('approved');
  
  if (hasIssues) {
    return `Document ${filename} identifies issues requiring attention. Review required to determine appropriate actions and compliance status.`;
  } else if (hasActions) {
    return `Document ${filename} outlines actions or requirements. Review needed to ensure compliance and proper implementation.`;
  } else if (isCompliant) {
    return `Document ${filename} indicates compliance with relevant standards. No immediate action required.`;
  } else {
    return `Document ${filename} has been processed. Review required to determine content, compliance status, and any necessary actions.`;
  }
}

function determineGeneralCompliance(text: string): 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown' {
  if (text.includes('compliant') && !text.includes('non-compliant')) {
    return 'compliant';
  } else if (text.includes('non-compliant') || text.includes('violation')) {
    return 'non-compliant';
  } else if (text.includes('partially') || text.includes('some issues')) {
    return 'partially-compliant';
  }
  return 'unknown';
}

function extractKeyDates(text: string): {
  issueDate: string | null;
  expiryDate: string | null;
  nextReviewDate: string | null;
  deadlines: string[];
} {
  let issueDate: string | null = null;
  let expiryDate: string | null = null;
  let nextReviewDate: string | null = null;
  const deadlines: string[] = [];
  
  // Extract issue date
  const issuePatterns = [
    /(?:issued|date|created|completed)[:\s]+([^.\n]+)/i,
    /(?:issue|creation|completion)\s+date[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of issuePatterns) {
    const match = text.match(pattern);
    if (match) {
      issueDate = match[1].trim();
      break;
    }
  }
  
  // Extract expiry date
  const expiryPatterns = [
    /(?:expires|expiry|valid until|expiration)[:\s]+([^.\n]+)/i,
    /(?:expiry|expiration)\s+date[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of expiryPatterns) {
    const match = text.match(pattern);
    if (match) {
      expiryDate = match[1].trim();
      break;
    }
  }
  
  // Extract next review date
  const reviewPatterns = [
    /(?:next review|review due|renewal)[:\s]+([^.\n]+)/i,
    /(?:review|renewal)\s+date[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of reviewPatterns) {
    const match = text.match(pattern);
    if (match) {
      nextReviewDate = match[1].trim();
      break;
    }
  }
  
  // Extract deadlines
  const deadlinePatterns = [
    /(?:deadline|due by|must complete)[:\s]+([^.\n]+)/gi,
    /(?:within|by|before)[:\s]+([^.\n]+)/gi
  ];
  
  deadlinePatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        deadlines.push(match[1].trim());
      }
    }
  });
  
  return { issueDate, expiryDate, nextReviewDate, deadlines };
}

function assessComplianceStatus(text: string): {
  overall: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
  areas: string[];
  gaps: string[];
} {
  let overall: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown' = 'unknown';
  const areas: string[] = [];
  const gaps: string[] = [];
  
  // Determine overall compliance
  if (text.includes('compliant') && !text.includes('non-compliant')) {
    overall = 'compliant';
  } else if (text.includes('non-compliant') || text.includes('violation')) {
    overall = 'non-compliant';
  } else if (text.includes('partially') || text.includes('some issues')) {
    overall = 'partially-compliant';
  }
  
  // Extract compliance areas
  const complianceAreas = [
    'safety',
    'health',
    'environmental',
    'structural',
    'electrical',
    'fire safety',
    'accessibility',
    'maintenance',
    'insurance',
    'planning'
  ];
  
  complianceAreas.forEach(area => {
    if (text.includes(area)) {
      areas.push(area);
    }
  });
  
  // Extract compliance gaps
  const gapPatterns = [
    'non-compliant',
    'violation',
    'defect',
    'issue',
    'problem',
    'deficiency',
    'gap',
    'missing',
    'inadequate',
    'insufficient'
  ];
  
  gapPatterns.forEach(gap => {
    if (text.includes(gap)) {
      gaps.push(gap);
    }
  });
  
  return { overall, areas, gaps };
}

function extractActionItems(text: string): {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
  completed: string[];
} {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];
  const completed: string[] = [];
  
  // Extract immediate actions
  const immediatePatterns = [
    'immediate action',
    'urgent',
    'emergency',
    'critical',
    'dangerous',
    'hazard'
  ];
  
  immediatePatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      immediate.push(`Address ${pattern} issues`);
    }
  });
  
  // Extract short-term actions
  const shortTermPatterns = [
    'action required',
    'must complete',
    'deadline',
    'remedial',
    'repair',
    'fix'
  ];
  
  shortTermPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      shortTerm.push(`Complete ${pattern} requirements`);
    }
  });
  
  // Extract long-term actions
  const longTermPatterns = [
    'upgrade',
    'improve',
    'enhance',
    'modernize',
    'replace',
    'install'
  ];
  
  longTermPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      longTerm.push(`Consider ${pattern} options`);
    }
  });
  
  // Extract completed actions
  const completedPatterns = [
    'completed',
    'finished',
    'done',
    'resolved',
    'fixed',
    'repaired'
  ];
  
  completedPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      completed.push(`Action ${pattern}`);
    }
  });
  
  return { immediate, shortTerm, longTerm, completed };
}

function extractResponsibleParties(text: string): {
  primary: string | null;
  secondary: string[];
  contractors: string[];
  consultants: string[];
} {
  let primary: string | null = null;
  const secondary: string[] = [];
  const contractors: string[] = [];
  const consultants: string[] = [];
  
  // Extract primary responsible party
  const primaryPatterns = [
    /(?:responsible|primary|main)[:\s]+([^.\n]+)/i,
    /(?:duty|obligation)[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of primaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      primary = match[1].trim();
      break;
    }
  }
  
  // Extract secondary parties
  const secondaryPatterns = [
    'landlord',
    'tenant',
    'leaseholder',
    'management company',
    'freeholder',
    'resident'
  ];
  
  secondaryPatterns.forEach(party => {
    if (text.includes(party)) {
      secondary.push(party);
    }
  });
  
  // Extract contractors
  const contractorPatterns = [
    'contractor',
    'builder',
    'engineer',
    'technician',
    'specialist',
    'maintenance'
  ];
  
  contractorPatterns.forEach(contractor => {
    if (text.includes(contractor)) {
      contractors.push(contractor);
    }
  });
  
  // Extract consultants
  const consultantPatterns = [
    'consultant',
    'surveyor',
    'architect',
    'engineer',
    'advisor',
    'expert'
  ];
  
  consultantPatterns.forEach(consultant => {
    if (text.includes(consultant)) {
      consultants.push(consultant);
    }
  });
  
  return { primary, secondary, contractors, consultants };
}

function assessGeneralRisk(text: string): {
  overall: 'low' | 'medium' | 'high' | 'unknown';
  factors: string[];
  mitigation: string[];
} {
  let overall: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
  const factors: string[] = [];
  const mitigation: string[] = [];
  
  // Determine overall risk
  if (text.includes('high risk') || text.includes('dangerous') || text.includes('critical')) {
    overall = 'high';
  } else if (text.includes('medium risk') || text.includes('moderate') || text.includes('attention')) {
    overall = 'medium';
  } else if (text.includes('low risk') || text.includes('safe') || text.includes('compliant')) {
    overall = 'low';
  }
  
  // Extract risk factors
  const riskPatterns = [
    'structural issue',
    'safety concern',
    'compliance gap',
    'maintenance backlog',
    'ageing infrastructure',
    'inadequate protection',
    'poor condition',
    'defect',
    'hazard'
  ];
  
  riskPatterns.forEach(factor => {
    if (text.includes(factor)) {
      factors.push(factor);
    }
  });
  
  // Extract mitigation measures
  const mitigationPatterns = [
    'mitigation',
    'prevention',
    'protection',
    'safety measure',
    'maintenance',
    'inspection',
    'monitoring',
    'upgrade'
  ];
  
  mitigationPatterns.forEach(measure => {
    if (text.includes(measure)) {
      mitigation.push(measure);
    }
  });
  
  return { overall, factors, mitigation };
}

function extractLegalRequirements(text: string): {
  regulations: string[];
  obligations: string[];
  penalties: string[];
  deadlines: string[];
} {
  const regulations: string[] = [];
  const obligations: string[] = [];
  const penalties: string[] = [];
  const deadlines: string[] = [];
  
  // Extract regulations
  const regulationPatterns = [
    'building regulations',
    'health and safety',
    'fire safety',
    'planning permission',
    'environmental',
    'accessibility',
    'energy efficiency'
  ];
  
  regulationPatterns.forEach(regulation => {
    if (text.includes(regulation)) {
      regulations.push(regulation);
    }
  });
  
  // Extract obligations
  const obligationPatterns = [
    'must',
    'shall',
    'required',
    'obligation',
    'duty',
    'responsibility',
    'compliance'
  ];
  
  obligationPatterns.forEach(obligation => {
    if (text.includes(obligation)) {
      obligations.push(obligation);
    }
  });
  
  // Extract penalties
  const penaltyPatterns = [
    'penalty',
    'fine',
    'enforcement',
    'prosecution',
    'legal action',
    'sanction',
    'breach'
  ];
  
  penaltyPatterns.forEach(penalty => {
    if (text.includes(penalty)) {
      penalties.push(penalty);
    }
  });
  
  // Extract deadlines
  const deadlinePatterns = [
    'deadline',
    'due date',
    'time limit',
    'period',
    'within',
    'by',
    'before'
  ];
  
  deadlinePatterns.forEach(deadline => {
    if (text.includes(deadline)) {
      deadlines.push(deadline);
    }
  });
  
  return { regulations, obligations, penalties, deadlines };
}

function extractGeneralRecommendations(text: string): string[] {
  const recommendations: string[] = [];
  
  const recommendationPatterns = [
    'recommend',
    'suggest',
    'advise',
    'consider',
    'should',
    'best practice',
    'improvement',
    'upgrade'
  ];
  
  recommendationPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      recommendations.push(pattern);
    }
  });
  
  return recommendations;
}

function determineNextSteps(text: string): string[] {
  const nextSteps: string[] = [];
  
  if (text.includes('action required') || text.includes('must complete')) {
    nextSteps.push('Review and prioritize action items');
  }
  
  if (text.includes('deadline') || text.includes('due date')) {
    nextSteps.push('Set reminders for upcoming deadlines');
  }
  
  if (text.includes('compliance') || text.includes('regulation')) {
    nextSteps.push('Verify compliance with relevant regulations');
  }
  
  if (text.includes('review') || text.includes('inspection')) {
    nextSteps.push('Schedule next review or inspection');
  }
  
  if (text.includes('contractor') || text.includes('specialist')) {
    nextSteps.push('Engage appropriate contractors or specialists');
  }
  
  nextSteps.push('Document all actions taken and outcomes');
  nextSteps.push('Monitor progress and update stakeholders');
  
  return nextSteps;
}
