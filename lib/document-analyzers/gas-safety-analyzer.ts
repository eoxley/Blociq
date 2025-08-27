export interface GasSafetyAnalysis {
  documentType: 'gas-safety';
  summary: string;
  complianceStatus: 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown';
  applianceChecks: {
    total: number;
    satisfactory: number;
    unsatisfactory: number;
    notApplicable: number;
    details: ApplianceCheck[];
  };
  flueTests: {
    total: number;
    satisfactory: number;
    unsatisfactory: number;
    details: FlueTest[];
  };
  nextInspectionDate: string | null;
  engineerDetails: {
    name: string | null;
    company: string | null;
    gasSafeNumber: string | null;
    qualifications: string[];
    signature: boolean;
  };
  safetyFeatures: {
    flameFailure: boolean;
    overheatProtection: boolean;
    pressureRelief: boolean;
    ventilation: boolean;
  };
  recommendations: string[];
  actionItems: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  complianceNotes: string[];
}

interface ApplianceCheck {
  type: string;
  location: string;
  condition: 'satisfactory' | 'unsatisfactory' | 'not-applicable';
  issues: string[];
  remedialAction?: string;
}

interface FlueTest {
  appliance: string;
  location: string;
  result: 'satisfactory' | 'unsatisfactory';
  issues: string[];
  remedialAction?: string;
}

/**
 * Analyze gas safety certificate document content
 */
export function analyzeGasSafety(extractedText: string, filename: string): GasSafetyAnalysis {
  const text = extractedText.toLowerCase();
  
  return {
    documentType: 'gas-safety',
    summary: generateGasSafetySummary(text, filename),
    complianceStatus: determineGasSafetyCompliance(text),
    applianceChecks: extractApplianceChecks(text),
    flueTests: extractFlueTests(text),
    nextInspectionDate: extractNextInspectionDate(text),
    engineerDetails: extractGasEngineerDetails(text),
    safetyFeatures: extractSafetyFeatures(text),
    recommendations: extractGasSafetyRecommendations(text),
    actionItems: categorizeGasSafetyActions(text),
    complianceNotes: extractComplianceNotes(text)
  };
}

function generateGasSafetySummary(text: string, filename: string): string {
  const hasUnsatisfactory = text.includes('unsatisfactory') || text.includes('action required');
  const isCompliant = text.includes('satisfactory') && !text.includes('unsatisfactory');
  
  if (hasUnsatisfactory) {
    return `Gas Safety Certificate for ${filename} identifies safety issues requiring attention. Some appliances or flues require remedial work to ensure compliance with gas safety regulations.`;
  } else if (isCompliant) {
    return `Gas Safety Certificate for ${filename} shows all gas appliances and flues are satisfactory and compliant with current safety standards. No immediate remedial action required.`;
  } else {
    return `Gas Safety Certificate for ${filename} has been completed. Review required to determine compliance status and any necessary actions.`;
  }
}

function determineGasSafetyCompliance(text: string): 'compliant' | 'non-compliant' | 'partially-compliant' | 'unknown' {
  if (text.includes('satisfactory') && !text.includes('unsatisfactory')) {
    return 'compliant';
  } else if (text.includes('unsatisfactory') || text.includes('dangerous')) {
    return 'non-compliant';
  } else if (text.includes('partially') || text.includes('some remedial')) {
    return 'partially-compliant';
  }
  return 'unknown';
}

function extractApplianceChecks(text: string): {
  total: number;
  satisfactory: number;
  unsatisfactory: number;
  notApplicable: number;
  details: ApplianceCheck[];
} {
  const details: ApplianceCheck[] = [];
  let total = 0;
  let satisfactory = 0;
  let unsatisfactory = 0;
  let notApplicable = 0;
  
  // Extract appliance information
  const applianceTypes = ['boiler', 'cooker', 'fire', 'heater', 'water heater', 'gas hob', 'oven'];
  const locations = ['kitchen', 'living room', 'bedroom', 'bathroom', 'utility', 'hall', 'conservatory'];
  
  applianceTypes.forEach(type => {
    if (text.includes(type)) {
      total++;
      
      let condition: 'satisfactory' | 'unsatisfactory' | 'not-applicable' = 'not-applicable';
      let location = 'Not specified';
      const issues: string[] = [];
      let remedialAction: string | undefined;
      
      // Determine condition
      if (text.includes(`${type} satisfactory`) || text.includes(`satisfactory ${type}`)) {
        condition = 'satisfactory';
        satisfactory++;
      } else if (text.includes(`${type} unsatisfactory`) || text.includes(`unsatisfactory ${type}`)) {
        condition = 'unsatisfactory';
        unsatisfactory++;
      } else {
        notApplicable++;
      }
      
      // Find location
      locations.forEach(loc => {
        if (text.includes(`${loc} ${type}`) || text.includes(`${type} ${loc}`)) {
          location = loc;
        }
      });
      
      // Extract issues
      if (condition === 'unsatisfactory') {
        const issuePatterns = [
          'flame failure',
          'overheat protection',
          'pressure relief',
          'ventilation',
          'flue condition',
          'gas pressure',
          'safety device'
        ];
        
        issuePatterns.forEach(issue => {
          if (text.includes(issue) && text.includes(type)) {
            issues.push(issue);
          }
        });
      }
      
      // Extract remedial action
      if (condition === 'unsatisfactory') {
        const remedialMatch = text.match(new RegExp(`${type}[^.]*(?:remedial|action|repair)[^.]*`, 'i'));
        if (remedialMatch) {
          remedialAction = remedialMatch[0];
        }
      }
      
      details.push({
        type,
        location,
        condition,
        issues,
        remedialAction
      });
    }
  });
  
  return { total, satisfactory, unsatisfactory, notApplicable, details };
}

function extractFlueTests(text: string): {
  total: number;
  satisfactory: number;
  unsatisfactory: number;
  details: FlueTest[];
} {
  const details: FlueTest[] = [];
  let total = 0;
  let satisfactory = 0;
  let unsatisfactory = 0;
  
  // Extract flue test information
  const fluePatterns = [
    /flue\s+test[:\s]+([^.\n]+)/gi,
    /chimney\s+test[:\s]+([^.\n]+)/gi,
    /ventilation\s+test[:\s]+([^.\n]+)/gi
  ];
  
  fluePatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        total++;
        
        let result: 'satisfactory' | 'unsatisfactory' = 'satisfactory';
        let appliance = 'Not specified';
        const issues: string[] = [];
        let remedialAction: string | undefined;
        
        const testText = match[1].toLowerCase();
        
        if (testText.includes('unsatisfactory') || testText.includes('failed')) {
          result = 'unsatisfactory';
          unsatisfactory++;
        } else {
          satisfactory++;
        }
        
        // Determine appliance
        const applianceTypes = ['boiler', 'cooker', 'fire', 'heater'];
        applianceTypes.forEach(type => {
          if (testText.includes(type)) {
            appliance = type;
          }
        });
        
        // Extract issues
        if (result === 'unsatisfactory') {
          const issuePatterns = [
            'blocked',
            'damaged',
            'inadequate',
            'poor condition',
            'insufficient draw',
            'spillage'
          ];
          
          issuePatterns.forEach(issue => {
            if (testText.includes(issue)) {
              issues.push(issue);
            }
          });
        }
        
        // Extract remedial action
        if (result === 'unsatisfactory') {
          const remedialMatch = testText.match(/(?:remedial|action|repair)[^.]*/);
          if (remedialMatch) {
            remedialAction = remedialMatch[0];
          }
        }
        
        details.push({
          appliance,
          location: 'Not specified',
          result,
          issues,
          remedialAction
        });
      }
    }
  });
  
  return { total, satisfactory, unsatisfactory, details };
}

function extractNextInspectionDate(text: string): string | null {
  const patterns = [
    /next\s+inspection\s+due[:\s]+([^.\n]+)/i,
    /next\s+check\s+due[:\s]+([^.\n]+)/i,
    /valid\s+until[:\s]+([^.\n]+)/i,
    /expires[:\s]+([^.\n]+)/i,
    /renewal\s+due[:\s]+([^.\n]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractGasEngineerDetails(text: string): {
  name: string | null;
  company: string | null;
  gasSafeNumber: string | null;
  qualifications: string[];
  signature: boolean;
} {
  let name: string | null = null;
  let company: string | null = null;
  let gasSafeNumber: string | null = null;
  const qualifications: string[] = [];
  let signature = false;
  
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
  
  // Extract Gas Safe number
  const gasSafeMatch = text.match(/gas\s+safe\s+(?:number|reg|registration)[:\s]*([a-z0-9]+)/i);
  if (gasSafeMatch) {
    gasSafeNumber = gasSafeMatch[1];
  }
  
  // Extract qualifications
  const qualificationPatterns = [
    'gas safe registered',
    'gas engineer',
    'gas installer',
    'gas fitter',
    'accredited',
    'certified',
    'qualified'
  ];
  
  qualificationPatterns.forEach(qual => {
    if (text.includes(qual)) {
      qualifications.push(qual);
    }
  });
  
  // Check for signature
  signature = text.includes('signature') || text.includes('signed') || text.includes('authorised');
  
  return { name, company, gasSafeNumber, qualifications, signature };
}

function extractSafetyFeatures(text: string): {
  flameFailure: boolean;
  overheatProtection: boolean;
  pressureRelief: boolean;
  ventilation: boolean;
} {
  return {
    flameFailure: text.includes('flame failure') || text.includes('ffd'),
    overheatProtection: text.includes('overheat protection') || text.includes('thermostat'),
    pressureRelief: text.includes('pressure relief') || text.includes('safety valve'),
    ventilation: text.includes('ventilation') || text.includes('air supply')
  };
}

function extractGasSafetyRecommendations(text: string): string[] {
  const recommendations: string[] = [];
  
  const recommendationPatterns = [
    'annual inspection',
    'regular maintenance',
    'upgrade appliances',
    'improve ventilation',
    'install safety devices',
    'replace old equipment',
    'professional servicing'
  ];
  
  recommendationPatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      recommendations.push(pattern);
    }
  });
  
  return recommendations;
}

function categorizeGasSafetyActions(text: string): {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
} {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];
  
  if (text.includes('immediate') || text.includes('urgent') || text.includes('dangerous')) {
    immediate.push('Address dangerous gas conditions immediately');
  }
  
  if (text.includes('remedial action') || text.includes('action required')) {
    shortTerm.push('Complete required remedial actions');
  }
  
  if (text.includes('upgrade') || text.includes('improve')) {
    longTerm.push('Consider gas appliance upgrades');
  }
  
  if (text.includes('next inspection') || text.includes('annual')) {
    shortTerm.push('Schedule next gas safety inspection');
  }
  
  return { immediate, shortTerm, longTerm };
}

function extractComplianceNotes(text: string): string[] {
  const notes: string[] = [];
  
  const compliancePatterns = [
    'gas safety regulations',
    'cp12 certificate',
    'annual requirement',
    'landlord obligation',
    'tenant notification',
    'safety standards',
    'building regulations'
  ];
  
  compliancePatterns.forEach(pattern => {
    if (text.includes(pattern)) {
      notes.push(pattern);
    }
  });
  
  return notes;
}
