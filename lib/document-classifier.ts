export type DocumentType = 
  | 'lease' 
  | 'eicr' 
  | 'gas-safety' 
  | 'fire-risk-assessment' 
  | 'major-works' 
  | 'section20' 
  | 'asbestos-survey' 
  | 'lift-inspection' 
  | 'insurance-valuation' 
  | 'building-survey' 
  | 'other';

export interface DocumentClassification {
  type: DocumentType;
  confidence: number;
  keywords: string[];
  reasoning: string;
}

// Keyword patterns for each document type
const DOCUMENT_PATTERNS: Record<DocumentType, {
  keywords: string[];
  phrases: string[];
  required: string[];
  scoring: {
    keyword: number;
    phrase: number;
    required: number;
  };
}> = {
  'lease': {
    keywords: ['lease', 'agreement', 'tenancy', 'lessor', 'lessee', 'demise', 'term', 'rent', 'service charge', 'letting', 'tenant', 'landlord', 'leasehold', 'freehold', 'ground rent', 'premium', 'demised premises', 'commencement date', 'expiry', 'renewal', 'forfeiture', 'assignment', 'underletting'],
    phrases: ['lease agreement', 'tenancy agreement', 'leasehold agreement', 'letting agreement', 'ground rent', 'service charge', 'demised premises', 'lease term', 'rent review', 'break clause', 'lease renewal', 'assignment of lease', 'underletting consent', 'forfeiture clause'],
    required: [], // Remove strict requirements to be more flexible
    scoring: { keyword: 3, phrase: 6, required: 0 }
  },
  'eicr': {
    keywords: ['eicr', 'electrical', 'inspection', 'condition', 'report', 'circuit', 'wiring', 'fuse', 'consumer unit'],
    phrases: ['electrical installation condition report', 'periodic inspection', 'electrical safety', 'circuit breaker'],
    required: ['eicr', 'electrical'],
    scoring: { keyword: 2, phrase: 5, required: 10 }
  },
  'gas-safety': {
    keywords: ['gas', 'safety', 'inspection', 'appliance', 'flue', 'boiler', 'heating', 'gas safe', 'cp12'],
    phrases: ['gas safety inspection', 'gas safety certificate', 'cp12 certificate', 'gas appliance'],
    required: ['gas', 'safety'],
    scoring: { keyword: 2, phrase: 5, required: 10 }
  },
  'fire-risk-assessment': {
    keywords: ['fire', 'risk', 'assessment', 'safety', 'evacuation', 'alarm', 'extinguisher', 'escape route'],
    phrases: ['fire risk assessment', 'fire safety', 'emergency evacuation', 'fire prevention'],
    required: ['fire', 'risk'],
    scoring: { keyword: 2, phrase: 5, required: 10 }
  },
  'major-works': {
    keywords: ['major works', 'construction', 'refurbishment', 'renovation', 'building work', 'project', 'contractor'],
    phrases: ['major works', 'building project', 'construction work', 'refurbishment project'],
    required: ['major', 'works'],
    scoring: { keyword: 2, phrase: 5, required: 10 }
  },
  'section20': {
    keywords: ['section 20', 'section20', 'consultation', 'leaseholder', 'notice', 'major works', 'statutory'],
    phrases: ['section 20 notice', 'statutory consultation', 'leaseholder consultation', 'major works consultation'],
    required: ['section', '20'],
    scoring: { keyword: 2, phrase: 5, required: 10 }
  },
  'asbestos-survey': {
    keywords: ['asbestos', 'survey', 'management', 'inspection', 'material', 'risk assessment', 'acm'],
    phrases: ['asbestos survey', 'asbestos management', 'asbestos inspection', 'acm survey'],
    required: ['asbestos', 'survey'],
    scoring: { keyword: 2, phrase: 5, required: 10 }
  },
  'lift-inspection': {
    keywords: ['lift', 'elevator', 'inspection', 'maintenance', 'safety', 'certificate', 'thorough examination'],
    phrases: ['lift inspection', 'lift maintenance', 'thorough examination', 'lift safety certificate'],
    required: ['lift', 'inspection'],
    scoring: { keyword: 2, phrase: 5, required: 10 }
  },
  'insurance-valuation': {
    keywords: ['insurance', 'valuation', 'rebuild', 'cost', 'sum insured', 'property', 'building', 'assessment'],
    phrases: ['insurance valuation', 'rebuild cost', 'sum insured', 'building insurance'],
    required: ['insurance', 'valuation'],
    scoring: { keyword: 2, phrase: 5, required: 10 }
  },
  'building-survey': {
    keywords: ['building', 'survey', 'inspection', 'structural', 'condition', 'report', 'assessment', 'defects'],
    phrases: ['building survey', 'structural survey', 'building inspection', 'condition report'],
    required: ['building', 'survey'],
    scoring: { keyword: 2, phrase: 5, required: 10 }
  },
  'other': {
    keywords: [],
    phrases: [],
    required: [],
    scoring: { keyword: 0, phrase: 0, required: 0 }
  }
};

/**
 * Classify a document based on extracted text and filename
 */
export function classifyDocument(extractedText: string, filename: string): DocumentClassification {
  const text = (extractedText + ' ' + filename).toLowerCase();
  const words = text.split(/\s+/);
  
  let bestMatch: DocumentType = 'other';
  let bestScore = 0;
  let bestKeywords: string[] = [];
  let bestReasoning = '';

  // Score each document type
  for (const [docType, pattern] of Object.entries(DOCUMENT_PATTERNS)) {
    if (docType === 'other') continue;
    
    let score = 0;
    const foundKeywords: string[] = [];
    const foundPhrases: string[] = [];
    
    // Check for required keywords (skip if no required keywords)
    const hasRequired = pattern.required.length === 0 || pattern.required.every(req => 
      words.some(word => word.includes(req))
    );
    
    if (!hasRequired) continue;
    
    // Score keywords
    for (const keyword of pattern.keywords) {
      if (words.some(word => word.includes(keyword))) {
        score += pattern.scoring.keyword;
        foundKeywords.push(keyword);
      }
    }
    
    // Score phrases
    for (const phrase of pattern.phrases) {
      if (text.includes(phrase)) {
        score += pattern.scoring.phrase;
        foundPhrases.push(phrase);
      }
    }
    
    // Bonus for required keywords (only if there are required keywords)
    if (pattern.required.length > 0) {
      score += pattern.scoring.required;
    }
    
    // Additional scoring based on document structure
    score += calculateStructureScore(docType as DocumentType, text);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = docType as DocumentType;
      bestKeywords = [...foundKeywords, ...foundPhrases];
      bestReasoning = buildReasoning(docType as DocumentType, foundKeywords, foundPhrases, score);
    }
  }
  
  // Calculate confidence based on score
  const confidence = Math.min(100, Math.max(0, (bestScore / 20) * 100));
  
  return {
    type: bestMatch,
    confidence,
    keywords: bestKeywords,
    reasoning: bestReasoning
  };
}

/**
 * Calculate additional score based on document structure and content patterns
 */
function calculateStructureScore(docType: DocumentType, text: string): number {
  let score = 0;
  
  switch (docType) {
    case 'lease':
      // Look for lease-specific structure and terms
      if (text.includes('demised premises') || text.includes('property hereby demised')) score += 5;
      if (text.includes('term of years') || text.includes('lease term')) score += 4;
      if (text.includes('rent review') || text.includes('annual rent')) score += 3;
      if (text.includes('service charge') || text.includes('maintenance charge')) score += 3;
      if (text.includes('forfeiture') || text.includes('re-entry')) score += 4;
      if (text.includes('assignment') || text.includes('subletting')) score += 3;
      if (text.includes('break clause') || text.includes('break option')) score += 3;
      if (text.includes('lessor') && text.includes('lessee')) score += 5;
      if (text.includes('tenant') && text.includes('landlord')) score += 4;
      if (text.includes('commencement date') || text.includes('lease commencement')) score += 3;
      if (text.includes('expiry date') || text.includes('term expiry')) score += 3;
      if (text.includes('ground rent') || text.includes('ground rental')) score += 4;
      if (text.includes('leasehold') || text.includes('lease hold')) score += 3;
      if (text.includes('premium') && (text.includes('lease') || text.includes('tenancy'))) score += 3;
      if (text.includes('covenant') || text.includes('covenants')) score += 2;
      if (text.includes('demise') || text.includes('hereby demised')) score += 4;
      // Check for legal structure
      if (text.includes('witnesseth') || text.includes('whereas')) score += 2;
      if (text.includes('schedule') && (text.includes('property') || text.includes('premises'))) score += 2;
      break;
      
    case 'eicr':
      if (text.includes('test results') || text.includes('periodic inspection')) score += 3;
      if (text.includes('bs 7671') || text.includes('iee regulations')) score += 2;
      if (text.includes('next test due') || text.includes('re-inspection')) score += 2;
      break;
      
    case 'gas-safety':
      if (text.includes('appliance checks') || text.includes('flue tests')) score += 3;
      if (text.includes('gas safe engineer') || text.includes('cp12')) score += 2;
      if (text.includes('next inspection') || text.includes('annual')) score += 2;
      break;
      
    case 'fire-risk-assessment':
      if (text.includes('risk rating') || text.includes('action plan')) score += 3;
      if (text.includes('evacuation') || text.includes('escape routes')) score += 2;
      if (text.includes('review date') || text.includes('next review')) score += 2;
      break;
      
    case 'major-works':
      if (text.includes('scope of works') || text.includes('project timeline')) score += 3;
      if (text.includes('contractor') || text.includes('tender')) score += 2;
      if (text.includes('budget') || text.includes('cost breakdown')) score += 2;
      break;
      
    case 'section20':
      if (text.includes('consultation stage') || text.includes('leaseholder response')) score += 3;
      if (text.includes('deadline') || text.includes('response period')) score += 2;
      if (text.includes('statutory') || text.includes('legal requirement')) score += 2;
      break;
      
    case 'asbestos-survey':
      if (text.includes('acm') || text.includes('asbestos containing material')) score += 3;
      if (text.includes('management plan') || text.includes('risk assessment')) score += 2;
      if (text.includes('re-inspection') || text.includes('monitoring')) score += 2;
      break;
      
    case 'lift-inspection':
      if (text.includes('thorough examination') || text.includes('safety certificate')) score += 3;
      if (text.includes('maintenance') || text.includes('next examination')) score += 2;
      if (text.includes('regulations') || text.includes('compliance')) score += 2;
      break;
      
    case 'insurance-valuation':
      if (text.includes('rebuild cost') || text.includes('sum insured')) score += 3;
      if (text.includes('property value') || text.includes('assessment')) score += 2;
      if (text.includes('insurance policy') || text.includes('coverage')) score += 2;
      break;
      
    case 'building-survey':
      if (text.includes('structural') || text.includes('condition report')) score += 3;
      if (text.includes('defects') || text.includes('recommendations')) score += 2;
      if (text.includes('surveyor') || text.includes('inspection')) score += 2;
      break;
  }
  
  return score;
}

/**
 * Build reasoning for the classification
 */
function buildReasoning(
  docType: DocumentType, 
  keywords: string[], 
  phrases: string[], 
  score: number
): string {
  const reasons: string[] = [];
  
  if (keywords.length > 0) {
    reasons.push(`Found keywords: ${keywords.join(', ')}`);
  }
  
  if (phrases.length > 0) {
    reasons.push(`Found phrases: ${phrases.join(', ')}`);
  }
  
  if (score >= 15) {
    reasons.push('High confidence match based on multiple indicators');
  } else if (score >= 10) {
    reasons.push('Good confidence match with key identifiers');
  } else {
    reasons.push('Basic match with minimal indicators');
  }
  
  return reasons.join('. ');
}

/**
 * Get document type description
 */
export function getDocumentTypeDescription(docType: DocumentType): string {
  const descriptions: Record<DocumentType, string> = {
    'lease': 'Lease Agreement - Legal document defining leaseholder rights and obligations',
    'eicr': 'Electrical Installation Condition Report - Electrical safety inspection report',
    'gas-safety': 'Gas Safety Certificate - Annual gas appliance safety inspection',
    'fire-risk-assessment': 'Fire Risk Assessment - Fire safety evaluation and action plan',
    'major-works': 'Major Works - Significant building works or refurbishment project',
    'section20': 'Section 20 Notice - Statutory consultation for major works',
    'asbestos-survey': 'Asbestos Survey - Asbestos material identification and management',
    'lift-inspection': 'Lift Inspection - Lift safety and maintenance certification',
    'insurance-valuation': 'Insurance Valuation - Property rebuild cost assessment',
    'building-survey': 'Building Survey - Structural condition and defect assessment',
    'other': 'Other Document - General property management document'
  };
  
  return descriptions[docType];
}

/**
 * Check if document type requires specific compliance actions
 */
export function requiresComplianceAction(docType: DocumentType): boolean {
  const complianceTypes: DocumentType[] = [
    'eicr', 'gas-safety', 'fire-risk-assessment', 'asbestos-survey', 'lift-inspection'
  ];
  
  return complianceTypes.includes(docType);
}

/**
 * Get typical review frequency for document type
 */
export function getReviewFrequency(docType: DocumentType): string {
  const frequencies: Record<DocumentType, string> = {
    'lease': 'As needed (when terms change)',
    'eicr': 'Every 5 years (or as specified)',
    'gas-safety': 'Annually',
    'fire-risk-assessment': 'Annually',
    'major-works': 'As needed (per project)',
    'section20': 'As needed (per consultation)',
    'asbestos-survey': 'Every 12 months',
    'lift-inspection': 'Every 6 months',
    'insurance-valuation': 'Every 3-5 years',
    'building-survey': 'As needed (when issues arise)',
    'other': 'Varies'
  };
  
  return frequencies[docType];
}
