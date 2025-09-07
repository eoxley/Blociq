/**
 * Document Intent Detection for Ask BlocIQ
 * Detects natural language requests for latest documents
 */

export interface DocumentIntent {
  kind: 'GET_LATEST_DOC';
  docType: string;
  buildingId?: string;
  unitId?: string;
  rawTypeText: string;
  confidence: number;
}

export interface DocumentTypeMapping {
  [key: string]: string;
}

// Document type aliases mapping
export const DOC_TYPE_ALIASES: DocumentTypeMapping = {
  // Insurance
  'insurance': 'insurance',
  'policy': 'insurance',
  'schedule': 'insurance',
  'policy schedule': 'insurance',
  'insurance schedule': 'insurance',
  
  // EICR
  'eicr': 'EICR',
  'electrical report': 'EICR',
  'electrical installation condition report': 'EICR',
  'electrical safety': 'EICR',
  
  // Fire Risk Assessment
  'fra': 'FRA',
  'fire risk assessment': 'FRA',
  'fire risk': 'FRA',
  'fire assessment': 'FRA',
  
  // External Wall System
  'ews1': 'FRAEW',
  'fraew': 'FRAEW',
  'external wall': 'FRAEW',
  'external wall system': 'FRAEW',
  'ews': 'FRAEW',
  
  // Water Risk
  'water risk': 'WaterRisk',
  'legionella': 'WaterRisk',
  'water risk assessment': 'WaterRisk',
  'legionella risk': 'WaterRisk',
  
  // Fire Alarm
  'fire alarm': 'FireAlarm',
  'fire detection': 'FireAlarm',
  'alarm system': 'FireAlarm',
  
  // Emergency Lighting
  'emergency lighting': 'EmergencyLighting',
  'emergency lights': 'EmergencyLighting',
  'emergency light': 'EmergencyLighting',
  
  // Fire Doors
  'fire doors': 'FireDoors',
  'fire door': 'FireDoors',
  'door inspection': 'FireDoors',
  
  // LOLER
  'loler': 'LiftLOLER',
  'lift': 'LiftLOLER',
  'lift inspection': 'LiftLOLER',
  'thorough examination': 'LiftLOLER',
  
  // Asbestos
  'asbestos': 'Asbestos',
  'asbestos survey': 'Asbestos',
  'asbestos register': 'Asbestos',
  
  // Lightning Protection
  'lightning': 'LightningProtection',
  'lightning protection': 'LightningProtection',
  'lightning system': 'LightningProtection',
  
  // Sprinkler
  'sprinkler': 'Sprinkler',
  'sprinkler system': 'Sprinkler',
  'sprinklers': 'Sprinkler'
};

// Action words that indicate document requests
const ACTION_WORDS = [
  'show', 'get', 'open', 'provide', 'send', 'fetch', 'find', 'retrieve',
  'latest', 'most recent', 'current', 'newest', 'last', 'recent'
];

// Building/unit context patterns
const BUILDING_PATTERNS = [
  /(?:for|of|at|in)\s+([A-Za-z0-9\s]+?)(?:\s+(?:house|building|block|flat|apartment|unit))/gi,
  /(?:house|building|block)\s+([A-Za-z0-9\s]+)/gi,
  /(?:flat|apartment|unit)\s+([A-Za-z0-9\s]+)/gi
];

// Unit patterns
const UNIT_PATTERNS = [
  /(?:flat|apartment|unit)\s+([A-Za-z0-9\s]+)/gi,
  /(?:flat|apartment|unit)\s+(\d+)/gi
];

/**
 * Normalize document type from raw text
 */
export function normalizeDocType(rawText: string): string | null {
  const normalized = rawText.toLowerCase().trim();
  
  // Direct match
  if (DOC_TYPE_ALIASES[normalized]) {
    return DOC_TYPE_ALIASES[normalized];
  }
  
  // Partial match - find the best match
  let bestMatch = '';
  let bestScore = 0;
  
  for (const [alias, docType] of Object.entries(DOC_TYPE_ALIASES)) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      const score = Math.min(normalized.length, alias.length) / Math.max(normalized.length, alias.length);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = docType;
      }
    }
  }
  
  return bestScore > 0.6 ? bestMatch : null;
}

/**
 * Extract building/unit context from text
 */
export function extractBuildingContext(text: string): { buildingId?: string; unitId?: string; buildingName?: string; unitName?: string } {
  const result: { buildingId?: string; unitId?: string; buildingName?: string; unitName?: string } = {};
  
  // Extract building name
  for (const pattern of BUILDING_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      result.buildingName = matches[0][1]?.trim();
      break;
    }
  }
  
  // Extract unit name/number
  for (const pattern of UNIT_PATTERNS) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      result.unitName = matches[0][1]?.trim();
      break;
    }
  }
  
  return result;
}

/**
 * Check if text contains action words indicating document request
 */
function hasActionWords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return ACTION_WORDS.some(word => lowerText.includes(word));
}

/**
 * Calculate confidence score for document intent
 */
function calculateConfidence(text: string, docType: string | null): number {
  if (!docType) return 0;
  
  let score = 0;
  const lowerText = text.toLowerCase();
  
  // Action words boost
  if (hasActionWords(lowerText)) {
    score += 0.3;
  }
  
  // Document type specificity
  const docTypeWords = docType.toLowerCase().split(/\s+/);
  const textWords = lowerText.split(/\s+/);
  const matchingWords = docTypeWords.filter(word => 
    textWords.some(textWord => textWord.includes(word) || word.includes(textWord))
  );
  score += (matchingWords.length / docTypeWords.length) * 0.4;
  
  // Building/unit context
  const context = extractBuildingContext(text);
  if (context.buildingName || context.unitName) {
    score += 0.3;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Detect document intent from user input
 */
export function detectDocumentIntent(
  text: string, 
  currentBuildingId?: string, 
  currentUnitId?: string
): DocumentIntent | null {
  const lowerText = text.toLowerCase();
  
  // Check if this looks like a document request
  if (!hasActionWords(lowerText)) {
    return null;
  }
  
  // Find document type
  let bestDocType = '';
  let bestScore = 0;
  
  for (const [alias, docType] of Object.entries(DOC_TYPE_ALIASES)) {
    if (lowerText.includes(alias)) {
      const score = alias.length / lowerText.length;
      if (score > bestScore) {
        bestScore = score;
        bestDocType = docType;
      }
    }
  }
  
  if (!bestDocType) {
    return null;
  }
  
  // Extract building/unit context
  const context = extractBuildingContext(text);
  
  // Calculate confidence
  const confidence = calculateConfidence(text, bestDocType);
  
  if (confidence < 0.3) {
    return null;
  }
  
  return {
    kind: 'GET_LATEST_DOC',
    docType: bestDocType,
    buildingId: currentBuildingId, // Will be resolved later
    unitId: currentUnitId, // Will be resolved later
    rawTypeText: bestDocType,
    confidence
  };
}

/**
 * Resolve building/unit IDs from context
 */
export async function resolveBuildingContext(
  context: { buildingName?: string; unitName?: string },
  currentBuildingId?: string,
  currentUnitId?: string
): Promise<{ buildingId?: string; unitId?: string }> {
  // If we have current context, use it
  if (currentBuildingId) {
    return {
      buildingId: currentBuildingId,
      unitId: currentUnitId
    };
  }
  
  // TODO: Implement fuzzy matching against user's buildings/units
  // For now, return the context names for manual resolution
  return {
    buildingId: context.buildingName ? undefined : undefined,
    unitId: context.unitName ? undefined : undefined
  };
}

/**
 * Get all supported document types
 */
export function getSupportedDocumentTypes(): string[] {
  return [...new Set(Object.values(DOC_TYPE_ALIASES))];
}

/**
 * Get document type display name
 */
export function getDocumentTypeDisplayName(docType: string): string {
  const displayNames: { [key: string]: string } = {
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
