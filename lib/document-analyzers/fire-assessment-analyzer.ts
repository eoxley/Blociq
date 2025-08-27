export interface FireRiskAssessmentAnalysis {
  documentType: 'fire-risk-assessment';
  summary: string;
  complianceStatus: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
  riskRating: {
    overall: 'low' | 'medium' | 'high' | 'unknown';
    factors: string[];
    justification: string;
  };
  actionPlan: {
    priority1: string[];
    priority2: string[];
    priority3: string[];
    completed: string[];
  };
  complianceStatus: {
    overall: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
    areas: string[];
    gaps: string[];
  };
  fireSafetyMeasures: {
    detection: string[];
    warning: string[];
    escape: string[];
    fighting: string[];
    maintenance: string[];
  };
  reviewDate: string | null;
  nextReviewDate: string | null;
  responsiblePerson: {
    name: string | null;
    role: string | null;
    contact: string | null;
  };
  emergencyProcedures: {
    evacuation: boolean;
    assemblyPoint: string | null;
    fireDrills: boolean;
    training: boolean;
  };
  recommendations: string[];
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

/**
 * Analyze fire risk assessment document content
 */
export function analyzeFireRiskAssessment(extractedText: string, filename: string): FireRiskAssessmentAnalysis {
  const text = extractedText.toLowerCase();
  
  return {
    documentType: 'fire-risk-assessment',
    summary: generateFireAssessmentSummary(text, filename),
    complianceStatus: determineFireCompliance(text),
    riskRating: extractRiskRating(text),
    actionPlan: extractActionPlan(text),
    complianceStatus: assessFireComplianceStatus(text),
    fireSafetyMeasures: extractFireSafetyMeasures(text),
    reviewDate: extractReviewDate(text),
    nextReviewDate: extractNextReviewDate(text),
    responsiblePerson: extractResponsiblePerson(text),
    emergencyProcedures: extractEmergencyProcedures(text),
    recommendations: extractFireRecommendations(text),
    actionItems: categorizeFireActions(text)
  };
}

function generateFireAssessmentSummary(text: string, filename: string): string {
  const hasHighRisk = text.includes('high risk') || text.includes('significant risk');
  const hasActions = text.includes('action required') || text.includes('priority');
  const isCompliant = text.includes('compliant') || text.includes('satisfactory');
  
  if (hasHighRisk) {
    return `Fire Risk Assessment for ${filename} identifies significant fire safety risks requiring immediate attention. Priority actions must be implemented to ensure building safety.`;
  } else if (hasActions) {
    return `Fire Risk Assessment for ${filename} identifies fire safety improvements needed. Action plan should be implemented to enhance fire safety measures.`;
  } else if (isCompliant) {
    return `Fire Risk Assessment for ${filename} shows fire safety measures are adequate and compliant with current regulations. Regular review and maintenance required.`;
  } else {
    return `Fire Risk Assessment for ${filename} has been completed. Review required to determine risk levels and necessary fire safety improvements.`;
  }
}

function determineFireCompliance(text: string): 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown' {
  if (text.includes('compliant') && !text.includes('non-compliant')) {
    return 'compliant';
  } else if (text.includes('non-compliant') || text.includes('significant risk')) {
    return 'non-compliant';
  } else if (text.includes('partially') || text.includes('some actions')) {
    return 'partially-compliant';
  }
  return 'unknown';
}

function extractRiskRating(text: string): {
  overall: 'low' | 'medium' | 'high' | 'unknown';
  factors: string[];
  justification: string;
} {
  let overall: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
  const factors: string[] = [];
  let justification = 'Not specified';
  
  // Determine overall risk
  if (text.includes('high risk') || text.includes('significant risk')) {
    overall = 'high';
  } else if (text.includes('medium risk') || text.includes('moderate risk')) {
    overall = 'medium';
  } else if (text.includes('low risk') || text.includes('minimal risk')) {
    overall = 'low';
  }
  
  // Extract risk factors
  const riskPatterns = [
    'combustible materials',
    'ignition sources',
    'electrical hazards',
    'cooking facilities',
    'smoking areas',
    'storage of flammable materials',
    'poor housekeeping',
    'inadequate escape routes',
    'lack of fire detection',
    'inadequate fire fighting equipment'
  ];
  
  riskPatterns.forEach(factor => {
    if (text.includes(factor)) {
      factors.push(factor);
    }
  });
  
  // Extract justification
  const justificationMatch = text.match(/(?:risk rating|assessment|justification)[:\s]+([^.\n]+)/i);
  if (justificationMatch) {
    justification = justificationMatch[1].trim();
  }
  
  return { overall, factors, justification };
}

function extractActionPlan(text: string): {
  priority1: string[];
  priority2: string[];
  priority3: string[];
  completed: string[];
} {
  const priority1: string[] = [];
  const priority2: string[] = [];
  const priority3: string[] = [];
  const completed: string[] = [];
  
  // Extract priority 1 actions (immediate)
  const priority1Patterns = [
    'immediate action',
    'urgent',
    'critical',
    'dangerous',
    'priority 1',
    'high priority'
  ];
  
  priority1Patterns.forEach(pattern => {
    if (text.includes(pattern)) {
      priority1.push(`Address ${pattern} issues`);
    }
  });
  
  // Extract priority 2 actions (short term)
  const priority2Patterns = [
    'short term',
    'within 3 months',
    'priority 2',
    'medium priority',
    'action required'
  ];
  
  priority2Patterns.forEach(pattern => {
    if (text.includes(pattern)) {
      priority2.push(`Complete ${pattern} requirements`);
    }
  });
  
  // Extract priority 3 actions (long term)
  const priority3Patterns = [
    'long term',
    'consider',
    'recommend',
    'priority 3',
    'low priority',
    'improvement'
  ];
  
  priority3Patterns.forEach(pattern => {
    if (text.includes(pattern)) {
      priority3.push(`Consider ${pattern} options`);
    }
  });
  
  // Extract completed actions
  const completedPatterns = [
    'completed',
    'implemented',
    'installed',
    'maintained',
    'upgraded',
    'replaced'
  ];
  
  completedPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      completed.push(`Action ${pattern}`);
    }
  });
  
  return { priority1, priority2, priority3, completed };
}

function assessFireComplianceStatus(text: string): {
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
  } else if (text.includes('non-compliant') || text.includes('significant risk')) {
    overall = 'non-compliant';
  } else if (text.includes('partially') || text.includes('some gaps')) {
    overall = 'partially-compliant';
  }
  
  // Extract compliance areas
  const complianceAreas = [
    'fire detection',
    'fire warning',
    'escape routes',
    'fire fighting equipment',
    'emergency lighting',
    'fire doors',
    'compartmentation',
    'signage',
    'training',
    'maintenance'
  ];
  
  complianceAreas.forEach(area => {
    if (text.includes(area)) {
      areas.push(area);
    }
  });
  
  // Extract compliance gaps
  const gapPatterns = [
    'missing',
    'inadequate',
    'poor condition',
    'not working',
    'out of date',
    'insufficient',
    'requires attention',
    'needs replacement'
  ];
  
  gapPatterns.forEach(gap => {
    if (text.includes(gap)) {
      gaps.push(gap);
    }
  });
  
  return { overall, areas, gaps };
}

function extractFireSafetyMeasures(text: string): {
  detection: string[];
  warning: string[];
  escape: string[];
  fighting: string[];
  maintenance: string[];
} {
  const detection: string[] = [];
  const warning: string[] = [];
  const escape: string[] = [];
  const fighting: string[] = [];
  const maintenance: string[] = [];
  
  // Extract detection systems
  const detectionPatterns = [
    'smoke detectors',
    'heat detectors',
    'fire alarm system',
    'automatic detection',
    'manual call points'
  ];
  
  detectionPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      detection.push(pattern);
    }
  });
  
  // Extract warning systems
  const warningPatterns = [
    'fire alarm',
    'sounders',
    'visual alarms',
    'strobe lights',
    'voice evacuation'
  ];
  
  warningPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      warning.push(pattern);
    }
  });
  
  // Extract escape measures
  const escapePatterns = [
    'escape routes',
    'fire exits',
    'emergency lighting',
    'exit signs',
    'escape stairs',
    'fire doors'
  ];
  
  escapePatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      escape.push(pattern);
    }
  });
  
  // Extract fire fighting equipment
  const fightingPatterns = [
    'fire extinguishers',
    'hose reels',
    'sprinkler system',
    'fire blankets',
    'hydrants'
  ];
  
  fightingPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      fighting.push(pattern);
    }
  });
  
  // Extract maintenance requirements
  const maintenancePatterns = [
    'regular testing',
    'weekly testing',
    'monthly testing',
    'annual service',
    'maintenance schedule',
    'inspection regime'
  ];
  
  maintenancePatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      maintenance.push(pattern);
    }
  });
  
  return { detection, warning, escape, fighting, maintenance };
}

function extractReviewDate(text: string): string | null {
  const patterns = [
    /(?:review|assessment)\s+date[:\s]+([^.\n]+)/i,
    /(?:completed|carried out)[:\s]+([^.\n]+)/i,
    /(?:date|issued)[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractNextReviewDate(text: string): string | null {
  const patterns = [
    /next\s+review[:\s]+([^.\n]+)/i,
    /review\s+due[:\s]+([^.\n]+)/i,
    /renewal[:\s]+([^.\n]+)/i,
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

function extractResponsiblePerson(text: string): {
  name: string | null;
  role: string | null;
  contact: string | null;
} {
  let name: string | null = null;
  let role: string | null = null;
  let contact: string | null = null;
  
  // Extract responsible person name
  const nameMatch = text.match(/(?:responsible person|fire safety manager|duty holder)[:\s]+([a-z\s]+)/i);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }
  
  // Extract role
  const roleMatch = text.match(/(?:role|position|title)[:\s]+([a-z\s]+)/i);
  if (roleMatch) {
    role = roleMatch[1].trim();
  }
  
  // Extract contact information
  const contactMatch = text.match(/(?:contact|phone|email)[:\s]+([^.\n]+)/i);
  if (contactMatch) {
    contact = contactMatch[1].trim();
  }
  
  return { name, role, contact };
}

function extractEmergencyProcedures(text: string): {
  evacuation: boolean;
  assemblyPoint: string | null;
  fireDrills: boolean;
  training: boolean;
} {
  const evacuation = text.includes('evacuation') || text.includes('escape procedure');
  let assemblyPoint: string | null = null;
  const fireDrills = text.includes('fire drill') || text.includes('evacuation drill');
  const training = text.includes('training') || text.includes('staff training');
  
  // Extract assembly point
  const assemblyMatch = text.match(/(?:assembly point|meeting point|safe area)[:\s]+([^.\n]+)/i);
  if (assemblyMatch) {
    assemblyPoint = assemblyMatch[1].trim();
  }
  
  return { evacuation, assemblyPoint, fireDrills, training };
}

function extractFireRecommendations(text: string): string[] {
  const recommendations: string[] = [];
  
  const recommendationPatterns = [
    'improve fire detection',
    'upgrade fire alarm',
    'enhance escape routes',
    'install additional equipment',
    'improve maintenance',
    'increase training',
    'regular fire drills',
    'update procedures'
  ];
  
  recommendationPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      recommendations.push(pattern);
    }
  });
  
  return recommendations;
}

function categorizeFireActions(text: string): {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
} {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];
  
  if (text.includes('immediate') || text.includes('urgent') || text.includes('critical')) {
    immediate.push('Address critical fire safety issues immediately');
  }
  
  if (text.includes('action required') || text.includes('priority')) {
    shortTerm.push('Implement priority fire safety actions');
  }
  
  if (text.includes('improve') || text.includes('enhance')) {
    longTerm.push('Consider fire safety system improvements');
  }
  
  if (text.includes('review') || text.includes('assessment')) {
    shortTerm.push('Schedule next fire risk assessment');
  }
  
  return { immediate, shortTerm, longTerm };
}
