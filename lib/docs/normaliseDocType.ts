/**
 * Document Type Normalization
 * Maps raw phrases to canonical document type values
 */

export type CanonicalDocType = 
  | 'insurance'
  | 'EICR'
  | 'FRA'
  | 'FRAEW'
  | 'WaterRisk'
  | 'FireAlarm'
  | 'EmergencyLighting'
  | 'FireDoors'
  | 'LiftLOLER'
  | 'Asbestos'
  | 'LightningProtection'
  | 'Sprinkler';

export const DOC_TYPE_ALIASES: Record<string, CanonicalDocType> = {
  // Insurance
  'insurance': 'insurance',
  'policy': 'insurance',
  'schedule': 'insurance',
  'policy schedule': 'insurance',
  'insurance schedule': 'insurance',
  'policy document': 'insurance',
  'insurance document': 'insurance',
  
  // EICR
  'eicr': 'EICR',
  'electrical report': 'EICR',
  'electrical installation condition report': 'EICR',
  'electrical safety': 'EICR',
  'electrical safety report': 'EICR',
  'electrical inspection': 'EICR',
  
  // Fire Risk Assessment
  'fra': 'FRA',
  'fire risk assessment': 'FRA',
  'fire risk': 'FRA',
  'fire assessment': 'FRA',
  'fire safety assessment': 'FRA',
  'fire safety report': 'FRA',
  
  // External Wall System
  'ews1': 'FRAEW',
  'fraew': 'FRAEW',
  'external wall': 'FRAEW',
  'external wall system': 'FRAEW',
  'ews': 'FRAEW',
  'external wall assessment': 'FRAEW',
  'external wall report': 'FRAEW',
  
  // Water Risk
  'water risk': 'WaterRisk',
  'legionella': 'WaterRisk',
  'water risk assessment': 'WaterRisk',
  'legionella risk': 'WaterRisk',
  'legionella assessment': 'WaterRisk',
  'water safety': 'WaterRisk',
  'water safety assessment': 'WaterRisk',
  
  // Fire Alarm
  'fire alarm': 'FireAlarm',
  'fire detection': 'FireAlarm',
  'alarm system': 'FireAlarm',
  'fire alarm system': 'FireAlarm',
  'fire detection system': 'FireAlarm',
  
  // Emergency Lighting
  'emergency lighting': 'EmergencyLighting',
  'emergency lights': 'EmergencyLighting',
  'emergency light': 'EmergencyLighting',
  'emergency lighting system': 'EmergencyLighting',
  'emergency lighting test': 'EmergencyLighting',
  
  // Fire Doors
  'fire doors': 'FireDoors',
  'fire door': 'FireDoors',
  'door inspection': 'FireDoors',
  'fire door inspection': 'FireDoors',
  'fire door test': 'FireDoors',
  
  // LOLER
  'loler': 'LiftLOLER',
  'lift': 'LiftLOLER',
  'lift inspection': 'LiftLOLER',
  'thorough examination': 'LiftLOLER',
  'lift test': 'LiftLOLER',
  'lift examination': 'LiftLOLER',
  
  // Asbestos
  'asbestos': 'Asbestos',
  'asbestos survey': 'Asbestos',
  'asbestos register': 'Asbestos',
  'asbestos report': 'Asbestos',
  'asbestos assessment': 'Asbestos',
  
  // Lightning Protection
  'lightning': 'LightningProtection',
  'lightning protection': 'LightningProtection',
  'lightning system': 'LightningProtection',
  'lightning protection system': 'LightningProtection',
  'lightning test': 'LightningProtection',
  
  // Sprinkler
  'sprinkler': 'Sprinkler',
  'sprinkler system': 'Sprinkler',
  'sprinklers': 'Sprinkler',
  'sprinkler test': 'Sprinkler',
  'sprinkler inspection': 'Sprinkler'
};

/**
 * Normalize raw text to canonical document type
 */
export function toCanon(raw: string): CanonicalDocType | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  
  const normalized = raw.toLowerCase().trim();
  
  // Direct match
  if (DOC_TYPE_ALIASES[normalized]) {
    return DOC_TYPE_ALIASES[normalized];
  }
  
  // Partial match - find the best match
  let bestMatch: CanonicalDocType | null = null;
  let bestScore = 0;
  
  for (const [alias, docType] of Object.entries(DOC_TYPE_ALIASES)) {
    // Check if the alias is contained in the input or vice versa
    if (normalized.includes(alias) || alias.includes(normalized)) {
      const score = Math.min(normalized.length, alias.length) / Math.max(normalized.length, alias.length);
      if (score > bestScore && score > 0.6) { // Minimum 60% match
        bestScore = score;
        bestMatch = docType;
      }
    }
  }
  
  return bestMatch;
}

/**
 * Get all supported document types
 */
export function getSupportedDocTypes(): CanonicalDocType[] {
  return [...new Set(Object.values(DOC_TYPE_ALIASES))];
}

/**
 * Get display name for a canonical document type
 */
export function getDisplayName(docType: CanonicalDocType): string {
  const displayNames: Record<CanonicalDocType, string> = {
    'insurance': 'Insurance',
    'EICR': 'EICR',
    'FRA': 'Fire Risk Assessment',
    'FRAEW': 'External Wall System',
    'WaterRisk': 'Water Risk Assessment',
    'FireAlarm': 'Fire Alarm',
    'EmergencyLighting': 'Emergency Lighting',
    'FireDoors': 'Fire Doors',
    'LiftLOLER': 'Lift LOLER',
    'Asbestos': 'Asbestos',
    'LightningProtection': 'Lightning Protection',
    'Sprinkler': 'Sprinkler'
  };
  
  return displayNames[docType] || docType;
}

/**
 * Check if a document type is valid
 */
export function isValidDocType(docType: string): docType is CanonicalDocType {
  return getSupportedDocTypes().includes(docType as CanonicalDocType);
}

/**
 * Get aliases for a document type
 */
export function getAliases(docType: CanonicalDocType): string[] {
  return Object.entries(DOC_TYPE_ALIASES)
    .filter(([_, type]) => type === docType)
    .map(([alias, _]) => alias);
}
