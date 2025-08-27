export interface MajorWorksAnalysis {
  documentType: 'major-works';
  summary: string;
  complianceStatus: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
  projectScope: {
    description: string;
    type: string[];
    location: string[];
    extent: string;
  };
  costs: {
    total: string | null;
    breakdown: string[];
    perLeaseholder: string | null;
    contingency: string | null;
  };
  consultationRequirements: {
    section20: boolean;
    stages: string[];
    leaseholderRights: string[];
    responseDeadlines: string[];
  };
  contractorDetails: {
    name: string | null;
    company: string | null;
    qualifications: string[];
    insurance: string | null;
    references: string[];
  };
  timeline: {
    startDate: string | null;
    completionDate: string | null;
    phases: string[];
    milestones: string[];
  };
  statutoryRequirements: {
    planningPermission: boolean;
    buildingRegulations: boolean;
    partyWallAct: boolean;
    other: string[];
  };
  riskAssessment: {
    overall: 'low' | 'medium' | 'high' | 'unknown';
    factors: string[];
    mitigation: string[];
  };
  recommendations: string[];
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

/**
 * Analyze major works document content
 */
export function analyzeMajorWorks(extractedText: string, filename: string): MajorWorksAnalysis {
  const text = extractedText.toLowerCase();
  
  return {
    documentType: 'major-works',
    summary: generateMajorWorksSummary(text, filename),
    complianceStatus: determineMajorWorksCompliance(text),
    projectScope: extractProjectScope(text),
    costs: extractCosts(text),
    consultationRequirements: extractConsultationRequirements(text),
    contractorDetails: extractContractorDetails(text),
    timeline: extractTimeline(text),
    statutoryRequirements: extractStatutoryRequirements(text),
    riskAssessment: assessMajorWorksRisk(text),
    recommendations: extractMajorWorksRecommendations(text),
    actionItems: categorizeMajorWorksActions(text)
  };
}

function generateMajorWorksSummary(text: string, filename: string): string {
  const hasSection20 = text.includes('section 20') || text.includes('consultation');
  const hasCosts = text.includes('cost') || text.includes('budget') || text.includes('estimate');
  const hasContractor = text.includes('contractor') || text.includes('builder') || text.includes('company');
  
  if (hasSection20 && hasCosts) {
    return `Major Works project for ${filename} includes Section 20 consultation requirements and cost estimates. Full statutory consultation process must be followed.`;
  } else if (hasCosts) {
    return `Major Works project for ${filename} includes cost estimates and project scope. Review required to determine consultation requirements.`;
  } else if (hasContractor) {
    return `Major Works project for ${filename} includes contractor details and project specifications. Cost analysis and consultation planning required.`;
  } else {
    return `Major Works project for ${filename} has been identified. Full project analysis required to determine scope, costs, and consultation requirements.`;
  }
}

function determineMajorWorksCompliance(text: string): 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown' {
  if (text.includes('section 20') && text.includes('consultation')) {
    return 'compliant';
  } else if (text.includes('major works') && !text.includes('section 20')) {
    return 'non-compliant';
  } else if (text.includes('consultation') || text.includes('cost estimate')) {
    return 'partially-compliant';
  }
  return 'unknown';
}

function extractProjectScope(text: string): {
  description: string;
  type: string[];
  location: string[];
  extent: string;
} {
  let description = 'Not specified';
  const type: string[] = [];
  const location: string[] = [];
  let extent = 'Not specified';
  
  // Extract project description
  const descriptionMatch = text.match(/(?:scope|description|works)[:\s]+([^.\n]+)/i);
  if (descriptionMatch) {
    description = descriptionMatch[1].trim();
  }
  
  // Extract project types
  const projectTypes = [
    'roof replacement',
    'window replacement',
    'heating system',
    'electrical upgrade',
    'structural repair',
    'refurbishment',
    'maintenance',
    'renovation',
    'extension',
    'drainage'
  ];
  
  projectTypes.forEach(projectType => {
    if (text.includes(projectType)) {
      type.push(projectType);
    }
  });
  
  // Extract locations
  const locations = [
    'roof',
    'windows',
    'heating',
    'electrical',
    'structural',
    'drainage',
    'common areas',
    'exterior',
    'interior',
    'grounds'
  ];
  
  locations.forEach(loc => {
    if (text.includes(loc)) {
      location.push(loc);
    }
  });
  
  // Extract extent
  const extentMatch = text.match(/(?:extent|scale|size)[:\s]+([^.\n]+)/i);
  if (extentMatch) {
    extent = extentMatch[1].trim();
  }
  
  return { description, type, location, extent };
}

function extractCosts(text: string): {
  total: string | null;
  breakdown: string[];
  perLeaseholder: string | null;
  contingency: string | null;
} {
  let total: string | null = null;
  const breakdown: string[] = [];
  let perLeaseholder: string | null = null;
  let contingency: string | null = null;
  
  // Extract total cost
  const totalMatch = text.match(/(?:total cost|budget|estimate)[:\s]*£?([0-9,]+)/i);
  if (totalMatch) {
    total = `£${totalMatch[1]}`;
  }
  
  // Extract cost breakdown
  const breakdownPatterns = [
    'materials',
    'labor',
    'contractor',
    'professional fees',
    'planning',
    'building control',
    'insurance',
    'scaffolding',
    'waste disposal'
  ];
  
  breakdownPatterns.forEach(item => {
    if (text.includes(item) && text.includes('cost')) {
      breakdown.push(item);
    }
  });
  
  // Extract per leaseholder cost
  const perLeaseholderMatch = text.match(/(?:per leaseholder|per unit|per flat)[:\s]*£?([0-9,]+)/i);
  if (perLeaseholderMatch) {
    perLeaseholder = `£${perLeaseholderMatch[1]}`;
  }
  
  // Extract contingency
  const contingencyMatch = text.match(/(?:contingency|allowance)[:\s]*£?([0-9,]+)/i);
  if (contingencyMatch) {
    contingency = `£${contingencyMatch[1]}`;
  }
  
  return { total, breakdown, perLeaseholder, contingency };
}

function extractConsultationRequirements(text: string): {
  section20: boolean;
  stages: string[];
  leaseholderRights: string[];
  responseDeadlines: string[];
} {
  const section20 = text.includes('section 20') || text.includes('statutory consultation');
  const stages: string[] = [];
  const leaseholderRights: string[] = [];
  const responseDeadlines: string[] = [];
  
  // Extract consultation stages
  const stagePatterns = [
    'stage 1',
    'stage 2',
    'stage 3',
    'notice of intention',
    'notice of estimates',
    'notice of award'
  ];
  
  stagePatterns.forEach(stage => {
    if (text.includes(stage)) {
      stages.push(stage);
    }
  });
  
  // Extract leaseholder rights
  const rightsPatterns = [
    'right to comment',
    'right to nominate',
    'right to object',
    'response period',
    'consultation period',
    'deadline'
  ];
  
  rightsPatterns.forEach(right => {
    if (text.includes(right)) {
      leaseholderRights.push(right);
    }
  });
  
  // Extract response deadlines
  const deadlinePatterns = [
    /(?:response|comment|objection)\s+deadline[:\s]+([^.\n]+)/gi,
    /(?:within|by|before)[:\s]+([^.\n]+)/gi
  ];
  
  deadlinePatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        responseDeadlines.push(match[1].trim());
      }
    }
  });
  
  return { section20, stages, leaseholderRights, responseDeadlines };
}

function extractContractorDetails(text: string): {
  name: string | null;
  company: string | null;
  qualifications: string[];
  insurance: string | null;
  references: string[];
} {
  let name: string | null = null;
  let company: string | null = null;
  const qualifications: string[] = [];
  let insurance: string | null = null;
  const references: string[] = [];
  
  // Extract contractor name
  const nameMatch = text.match(/(?:contractor|builder|company)[:\s]+([a-z\s]+)/i);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }
  
  // Extract company details
  const companyMatch = text.match(/(?:company|firm|organisation)[:\s]+([a-z\s]+)/i);
  if (companyMatch) {
    company = companyMatch[1].trim();
  }
  
  // Extract qualifications
  const qualificationPatterns = [
    'accredited',
    'certified',
    'licensed',
    'registered',
    'qualified',
    'experienced',
    'specialist'
  ];
  
  qualificationPatterns.forEach(qual => {
    if (text.includes(qual)) {
      qualifications.push(qual);
    }
  });
  
  // Extract insurance details
  const insuranceMatch = text.match(/(?:insurance|public liability)[:\s]+([^.\n]+)/i);
  if (insuranceMatch) {
    insurance = insuranceMatch[1].trim();
  }
  
  // Extract references
  const referencePatterns = [
    'reference',
    'previous work',
    'experience',
    'portfolio',
    'testimonial'
  ];
  
  referencePatterns.forEach(ref => {
    if (text.includes(ref)) {
      references.push(ref);
    }
  });
  
  return { name, company, qualifications, insurance, references };
}

function extractTimeline(text: string): {
  startDate: string | null;
  completionDate: string | null;
  phases: string[];
  milestones: string[];
} {
  let startDate: string | null = null;
  let completionDate: string | null = null;
  const phases: string[] = [];
  const milestones: string[] = [];
  
  // Extract start date
  const startMatch = text.match(/(?:start|commence|begin)[:\s]+([^.\n]+)/i);
  if (startMatch) {
    startDate = startMatch[1].trim();
  }
  
  // Extract completion date
  const completionMatch = text.match(/(?:completion|finish|end)[:\s]+([^.\n]+)/i);
  if (completionMatch) {
    completionDate = completionMatch[1].trim();
  }
  
  // Extract phases
  const phasePatterns = [
    'phase 1',
    'phase 2',
    'phase 3',
    'planning',
    'preparation',
    'construction',
    'completion',
    'handover'
  ];
  
  phasePatterns.forEach(phase => {
    if (text.includes(phase)) {
      phases.push(phase);
    }
  });
  
  // Extract milestones
  const milestonePatterns = [
    'milestone',
    'key date',
    'deadline',
    'target',
    'checkpoint'
  ];
  
  milestonePatterns.forEach(milestone => {
    if (text.includes(milestone)) {
      milestones.push(milestone);
    }
  });
  
  return { startDate, completionDate, phases, milestones };
}

function extractStatutoryRequirements(text: string): {
  planningPermission: boolean;
  buildingRegulations: boolean;
  partyWallAct: boolean;
  other: string[];
} {
  const planningPermission = text.includes('planning permission') || text.includes('planning consent');
  const buildingRegulations = text.includes('building regulations') || text.includes('building control');
  const partyWallAct = text.includes('party wall') || text.includes('party wall act');
  const other: string[] = [];
  
  // Extract other statutory requirements
  const otherPatterns = [
    'listed building consent',
    'conservation area',
    'tree preservation',
    'environmental impact',
    'health and safety',
    'fire safety'
  ];
  
  otherPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      other.push(pattern);
    }
  });
  
  return { planningPermission, buildingRegulations, partyWallAct, other };
}

function assessMajorWorksRisk(text: string): {
  overall: 'low' | 'medium' | 'high' | 'unknown';
  factors: string[];
  mitigation: string[];
} {
  let overall: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
  const factors: string[] = [];
  const mitigation: string[] = [];
  
  // Determine overall risk
  if (text.includes('high risk') || text.includes('complex') || text.includes('structural')) {
    overall = 'high';
  } else if (text.includes('medium risk') || text.includes('moderate')) {
    overall = 'medium';
  } else if (text.includes('low risk') || text.includes('simple')) {
    overall = 'low';
  }
  
  // Extract risk factors
  const riskPatterns = [
    'structural work',
    'complex project',
    'multiple phases',
    'tight timeline',
    'budget constraints',
    'access issues',
    'weather dependent',
    'disruption to residents',
    'coordination challenges'
  ];
  
  riskPatterns.forEach(factor => {
    if (text.includes(factor)) {
      factors.push(factor);
    }
  });
  
  // Extract mitigation measures
  const mitigationPatterns = [
    'planning',
    'risk assessment',
    'method statement',
    'insurance',
    'contingency',
    'professional supervision',
    'quality control',
    'communication plan'
  ];
  
  mitigationPatterns.forEach(measure => {
    if (text.includes(measure)) {
      mitigation.push(measure);
    }
  });
  
  return { overall, factors, mitigation };
}

function extractMajorWorksRecommendations(text: string): string[] {
  const recommendations: string[] = [];
  
  const recommendationPatterns = [
    'professional advice',
    'detailed planning',
    'risk assessment',
    'method statement',
    'quality control',
    'communication plan',
    'resident consultation',
    'timeline management',
    'budget control'
  ];
  
  recommendationPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      recommendations.push(pattern);
    }
  });
  
  return recommendations;
}

function categorizeMajorWorksActions(text: string): {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
} {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];
  
  if (text.includes('urgent') || text.includes('immediate') || text.includes('critical')) {
    immediate.push('Address critical project issues immediately');
  }
  
  if (text.includes('planning') || text.includes('consultation') || text.includes('section 20')) {
    shortTerm.push('Complete planning and consultation requirements');
  }
  
  if (text.includes('contractor') || text.includes('tender') || text.includes('procurement')) {
    shortTerm.push('Complete contractor selection and procurement');
  }
  
  if (text.includes('implementation') || text.includes('construction') || text.includes('work')) {
    longTerm.push('Implement major works project');
  }
  
  return { immediate, shortTerm, longTerm };
}
