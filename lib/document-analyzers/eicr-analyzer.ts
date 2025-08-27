export interface EICRAnalysis {
  documentType: 'eicr';
  summary: string;
  complianceStatus: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
  testResults: {
    overall: string;
    details: string[];
  };
  remedialActions: {
    required: boolean;
    actions: string[];
    priority: 'high' | 'medium' | 'low';
    deadline?: string;
  };
  nextTestDue: string | null;
  electricalSafety: {
    consumerUnit: string;
    wiring: string;
    earthing: string;
    bonding: string;
    circuits: string[];
  };
  engineerDetails: {
    name: string | null;
    company: string | null;
    qualifications: string[];
    gasSafeNumber?: string;
  };
  standards: {
    bs7671: boolean;
    ieeRegulations: boolean;
    otherStandards: string[];
  };
  riskAssessment: {
    overall: 'low' | 'medium' | 'high' | 'unknown';
    factors: string[];
  };
  recommendations: string[];
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

/**
 * Analyze EICR document content
 */
export function analyzeEICR(extractedText: string, filename: string): EICRAnalysis {
  const text = extractedText.toLowerCase();
  
  return {
    documentType: 'eicr',
    summary: generateEICRSummary(text, filename),
    complianceStatus: determineComplianceStatus(text),
    testResults: extractTestResults(text),
    remedialActions: extractRemedialActions(text),
    nextTestDue: extractNextTestDue(text),
    electricalSafety: extractElectricalSafety(text),
    engineerDetails: extractEngineerDetails(text),
    standards: extractStandards(text),
    riskAssessment: assessRisk(text),
    recommendations: extractRecommendations(text),
    actionItems: categorizeActionItems(text)
  };
}

function generateEICRSummary(text: string, filename: string): string {
  const hasRemedial = text.includes('remedial') || text.includes('action required') || text.includes('unsatisfactory');
  const isCompliant = text.includes('satisfactory') || text.includes('compliant') || text.includes('pass');
  
  if (hasRemedial) {
    return `EICR for ${filename} identifies electrical safety issues requiring remedial action. The installation requires attention to ensure compliance with BS 7671 standards.`;
  } else if (isCompliant) {
    return `EICR for ${filename} shows the electrical installation is satisfactory and compliant with current regulations. No immediate remedial action required.`;
  } else {
    return `EICR for ${filename} has been completed. Review required to determine compliance status and any necessary actions.`;
  }
}

function determineComplianceStatus(text: string): 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown' {
  if (text.includes('satisfactory') && !text.includes('unsatisfactory')) {
    return 'compliant';
  } else if (text.includes('unsatisfactory') || text.includes('dangerous')) {
    return 'non-compliant';
  } else if (text.includes('partially') || text.includes('some remedial')) {
    return 'partially-compliant';
  }
  return 'unknown';
}

function extractTestResults(text: string): { overall: string; details: string[] } {
  let overall = 'Not specified';
  const details: string[] = [];
  
  // Extract overall result
  if (text.includes('satisfactory')) overall = 'Satisfactory';
  if (text.includes('unsatisfactory')) overall = 'Unsatisfactory';
  if (text.includes('partially satisfactory')) overall = 'Partially Satisfactory';
  
  // Extract specific test details
  const testPatterns = [
    'circuit breaker test',
    'rcd test',
    'earth fault loop impedance',
    'continuity test',
    'insulation resistance',
    'polarity test',
    'voltage drop'
  ];
  
  testPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      details.push(pattern);
    }
  });
  
  return { overall, details };
}

function extractRemedialActions(text: string): {
  required: boolean;
  actions: string[];
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
} {
  const required = text.includes('remedial') || text.includes('action required') || text.includes('unsatisfactory');
  const actions: string[] = [];
  let priority: 'high' | 'medium' | 'low' = 'medium';
  
  if (required) {
    // Extract remedial actions
    const actionPatterns = [
      'replace consumer unit',
      'upgrade wiring',
      'install rcd protection',
      'improve earthing',
      'fix circuit faults',
      'upgrade bonding',
      'replace defective equipment'
    ];
    
    actionPatterns.forEach(pattern => {
      if (text.includes(pattern)) {
        actions.push(pattern);
      }
    });
    
    // Determine priority
    if (text.includes('dangerous') || text.includes('immediate') || text.includes('urgent')) {
      priority = 'high';
    } else if (text.includes('soon') || text.includes('short term')) {
      priority = 'medium';
    } else {
      priority = 'low';
    }
  }
  
  // Extract deadline if specified
  let deadline: string | undefined;
  const deadlineMatch = text.match(/(?:within|by|deadline|due)\s+(\d+\s+(?:days?|weeks?|months?))/i);
  if (deadlineMatch) {
    deadline = deadlineMatch[1];
  }
  
  return { required, actions, priority, deadline };
}

function extractNextTestDue(text: string): string | null {
  const patterns = [
    /next\s+test\s+due[:\s]+([^.\n]+)/i,
    /re-inspection\s+due[:\s]+([^.\n]+)/i,
    /next\s+inspection[:\s]+([^.\n]+)/i,
    /valid\s+until[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractElectricalSafety(text: string): {
  consumerUnit: string;
  wiring: string;
  earthing: string;
  bonding: string;
  circuits: string[];
} {
  const consumerUnit = text.includes('consumer unit') ? 'Present' : 'Not specified';
  const wiring = text.includes('wiring') ? 'Inspected' : 'Not specified';
  const earthing = text.includes('earthing') ? 'Present' : 'Not specified';
  const bonding = text.includes('bonding') ? 'Present' : 'Not specified';
  
  const circuits: string[] = [];
  const circuitTypes = ['lighting', 'power', 'kitchen', 'bathroom', 'outdoor', 'emergency'];
  
  circuitTypes.forEach(type => {
    if (text.includes(type + ' circuit') || text.includes(type + ' circuits')) {
      circuits.push(type);
    }
  });
  
  return { consumerUnit, wiring, earthing, bonding, circuits };
}

function extractEngineerDetails(text: string): {
  name: string | null;
  company: string | null;
  qualifications: string[];
  gasSafeNumber?: string;
} {
  let name: string | null = null;
  let company: string | null = null;
  const qualifications: string[] = [];
  
  // Extract engineer name
  const nameMatch = text.match(/(?:engineer|inspector|qualified person)[:\s]+([a-z\s]+)/i);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }
  
  // Extract company
  const companyMatch = text.match(/(?:company|firm|organisation)[:\s]+([a-z\s]+)/i);
  if (companyMatch) {
    company = companyMatch[1].trim();
  }
  
  // Extract qualifications
  const qualificationPatterns = [
    'napit',
    'niceic',
    'elecsa',
    'city and guilds',
    'electrical engineer',
    'qualified electrician'
  ];
  
  qualificationPatterns.forEach(qual => {
    if (text.includes(qual)) {
      qualifications.push(qual);
    }
  });
  
  // Extract Gas Safe number if present
  let gasSafeNumber: string | undefined;
  const gasSafeMatch = text.match(/gas\s+safe\s+(?:number|reg)[:\s]*([a-z0-9]+)/i);
  if (gasSafeMatch) {
    gasSafeNumber = gasSafeMatch[1];
  }
  
  return { name, company, qualifications, gasSafeNumber };
}

function extractStandards(text: string): {
  bs7671: boolean;
  ieeRegulations: boolean;
  otherStandards: string[];
} {
  const bs7671 = text.includes('bs 7671') || text.includes('bs7671');
  const ieeRegulations = text.includes('iee') || text.includes('institution of electrical engineers');
  
  const otherStandards: string[] = [];
  const standardPatterns = [
    'building regulations',
    'part p',
    'iee wiring regulations',
    'electrical safety standards'
  ];
  
  standardPatterns.forEach(standard => {
    if (text.includes(standard)) {
      otherStandards.push(standard);
    }
  });
  
  return { bs7671, ieeRegulations, otherStandards };
}

function assessRisk(text: string): {
  overall: 'low' | 'medium' | 'high' | 'unknown';
  factors: string[];
} {
  let overall: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
  const factors: string[] = [];
  
  if (text.includes('dangerous') || text.includes('immediate danger')) {
    overall = 'high';
  } else if (text.includes('unsatisfactory') || text.includes('remedial action')) {
    overall = 'medium';
  } else if (text.includes('satisfactory') && !text.includes('unsatisfactory')) {
    overall = 'low';
  }
  
  // Extract risk factors
  const riskPatterns = [
    'old wiring',
    'overloaded circuits',
    'poor earthing',
    'defective equipment',
    'inadequate protection',
    'missing rcd',
    'deteriorated insulation'
  ];
  
  riskPatterns.forEach(factor => {
    if (text.includes(factor)) {
      factors.push(factor);
    }
  });
  
  return { overall, factors };
}

function extractRecommendations(text: string): string[] {
  const recommendations: string[] = [];
  
  const recommendationPatterns = [
    'upgrade consumer unit',
    'install rcd protection',
    'improve earthing system',
    'replace old wiring',
    'upgrade bonding',
    'regular maintenance',
    'annual inspection',
    'immediate remedial action'
  ];
  
  recommendationPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      recommendations.push(pattern);
    }
  });
  
  return recommendations;
}

function categorizeActionItems(text: string): {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
} {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];
  
  if (text.includes('immediate') || text.includes('urgent') || text.includes('dangerous')) {
    immediate.push('Address dangerous electrical conditions immediately');
  }
  
  if (text.includes('remedial action') || text.includes('action required')) {
    shortTerm.push('Complete required remedial actions');
  }
  
  if (text.includes('upgrade') || text.includes('improve')) {
    longTerm.push('Consider electrical system upgrades');
  }
  
  if (text.includes('next test') || text.includes('re-inspection')) {
    shortTerm.push('Schedule next electrical inspection');
  }
  
  return { immediate, shortTerm, longTerm };
}
