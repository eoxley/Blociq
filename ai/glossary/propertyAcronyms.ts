/**
 * Property Management Acronyms Glossary
 * 
 * This file defines the canonical meanings of acronyms used in UK leasehold
 * block management. The Outlook Add-in uses this to ensure domain-specific
 * interpretation of acronyms.
 */

export interface AcronymDefinition {
  acronym: string;
  fullName: string;
  description: string;
  domain: 'insurance' | 'compliance' | 'legal' | 'safety' | 'management' | 'technical';
  context?: string;
}

export const PROPERTY_ACRONYMS: Record<string, AcronymDefinition> = {
  // Insurance & Valuation
  'RCA': {
    acronym: 'RCA',
    fullName: 'Restatement Cost Analysis',
    description: 'Insurance rebuild valuation assessment',
    domain: 'insurance',
    context: 'Used for insurance purposes to determine rebuild costs'
  },

  // Legal & Compliance
  'S20': {
    acronym: 'S20',
    fullName: 'Section 20',
    description: 'Landlord and Tenant Act 1985 consultation thresholds',
    domain: 'legal',
    context: 'Required for works over £250 per leaseholder or long-term agreements over £100 per leaseholder per year'
  },
  'SECTION20': {
    acronym: 'Section 20',
    fullName: 'Section 20',
    description: 'Landlord and Tenant Act 1985 consultation thresholds',
    domain: 'legal',
    context: 'Required for works over £250 per leaseholder or long-term agreements over £100 per leaseholder per year'
  },
  'S.146': {
    acronym: 'S.146',
    fullName: 'Section 146',
    description: 'Forfeiture/relief pre-conditions under Law of Property Act 1925',
    domain: 'legal',
    context: 'Notice requirements before forfeiture proceedings'
  },

  // Safety & Compliance
  'FRA': {
    acronym: 'FRA',
    fullName: 'Fire Risk Assessment',
    description: 'Assessment of fire safety risks in a building',
    domain: 'safety',
    context: 'Required under Regulatory Reform (Fire Safety) Order 2005'
  },
  'FRAEW': {
    acronym: 'FRAEW',
    fullName: 'Fire Risk Assessment External Wall',
    description: 'Fire risk assessment specifically for external wall systems',
    domain: 'safety',
    context: 'Required for buildings with external wall systems'
  },
  'EICR': {
    acronym: 'EICR',
    fullName: 'Electrical Installation Condition Report',
    description: 'Periodic inspection and testing of electrical installations',
    domain: 'safety',
    context: 'Required every 5 years for residential properties'
  },
  'EWS1': {
    acronym: 'EWS1',
    fullName: 'External Wall System assessment form',
    description: 'Form for assessing external wall system fire safety',
    domain: 'safety',
    context: 'Required for buildings with cladding or external wall systems'
  },

  // Building Safety
  'HRB': {
    acronym: 'HRB',
    fullName: 'Higher-Risk Building',
    description: 'Building subject to Building Safety Act 2022 requirements',
    domain: 'safety',
    context: 'Buildings 18m+ or 7+ storeys with residential units'
  },
  'BSA': {
    acronym: 'BSA',
    fullName: 'Building Safety Act',
    description: 'Building Safety Act 2022',
    domain: 'safety',
    context: 'Legislation for building safety in England'
  },

  // Management
  'RMC': {
    acronym: 'RMC',
    fullName: 'Residents Management Company',
    description: 'Company formed by leaseholders to manage their building',
    domain: 'management',
    context: 'Alternative to traditional freeholder management'
  },
  'RTM': {
    acronym: 'RTM',
    fullName: 'Right to Manage',
    description: 'Leaseholders\' right to take over building management',
    domain: 'management',
    context: 'Under Commonhold and Leasehold Reform Act 2002'
  },
  'RTA': {
    acronym: 'RTA',
    fullName: 'Recognised Tenants\' Association',
    description: 'Formal association of leaseholders recognised by law',
    domain: 'management',
    context: 'Provides collective representation for leaseholders'
  },

  // Technical
  'BCIS': {
    acronym: 'BCIS',
    fullName: 'Building Cost Information Service',
    description: 'RICS cost database for construction and maintenance',
    domain: 'technical',
    context: 'Used as basis for cost estimates and valuations'
  }
};

/**
 * Check if a term is a known property management acronym
 */
export function isPropertyAcronym(term: string): boolean {
  const upperTerm = term.toUpperCase();
  return upperTerm in PROPERTY_ACRONYMS;
}

/**
 * Get the definition for a property acronym
 */
export function getAcronymDefinition(term: string): AcronymDefinition | null {
  const upperTerm = term.toUpperCase();
  return PROPERTY_ACRONYMS[upperTerm] || null;
}

/**
 * Expand acronyms in text with their full meanings
 */
export function expandAcronymsInText(text: string): string {
  let expandedText = text;
  
  // Find all potential acronyms (2-6 uppercase letters)
  const acronymRegex = /\b[A-Z]{2,6}\b/g;
  const matches = text.match(acronymRegex);
  
  if (matches) {
    for (const match of matches) {
      const definition = getAcronymDefinition(match);
      if (definition) {
        // Replace with full name and description
        const replacement = `${definition.fullName} (${definition.description})`;
        expandedText = expandedText.replace(new RegExp(`\\b${match}\\b`, 'g'), replacement);
      }
    }
  }
  
  return expandedText;
}

/**
 * Check if a term is out of scope for property management
 */
export function isOutOfScope(term: string): boolean {
  const outOfScopeTerms = [
    'GITHUB', 'AWS', 'API', 'JSON', 'XML', 'HTML', 'CSS', 'JAVASCRIPT', 'TYPESCRIPT',
    'NODE', 'REACT', 'NEXT', 'VERCEL', 'DOCKER', 'KUBERNETES', 'TERRAFORM',
    'SECRETS', 'KEYS', 'TOKENS', 'AUTH', 'OAUTH', 'JWT', 'SSL', 'TLS',
    'DATABASE', 'SQL', 'POSTGRES', 'MYSQL', 'MONGODB', 'REDIS',
    'SERVER', 'CLOUD', 'DEVOPS', 'CI', 'CD', 'PIPELINE'
  ];
  
  return outOfScopeTerms.includes(term.toUpperCase());
}

/**
 * Generate clarification prompt for ambiguous acronyms
 */
export function generateClarificationPrompt(term: string): string {
  const definition = getAcronymDefinition(term);
  if (definition) {
    return `In BlocIQ, ${term} normally means ${definition.fullName} (${definition.description}). Is that what you meant?`;
  }
  return `Could you clarify what you mean by "${term}"?`;
}
