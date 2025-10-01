/**
 * Building Context Resolution
 * Resolves building and unit context from free text and current context
 */

export interface BuildingContext {
  buildingId?: string;
  unitId?: string;
  buildingName?: string;
  unitName?: string;
}

export interface CurrentContext {
  buildingId?: string;
  unitId?: string;
  buildingName?: string;
  unitName?: string;
}

// Common building name patterns - enhanced for street names and addresses
const BUILDING_PATTERNS = [
  // Street names and addresses (like "Westbourne Grove", "Henrietta House")
  /(?:for|of|at|in)\s+([A-Za-z0-9\s]+(?:grove|road|street|lane|close|way|drive|avenue|place|court|square|gardens?|park|view|heights?|house|building|block|apartment|manor|hall|tower|estate|development|mews|terrace|walk|rise|hill|point|residence|chambers))/gi,
  
  // Unit references with building context
  /(?:unit|flat|apartment)\s+(\d+[a-z]?)\s+(?:at|in|of)\s+([A-Za-z0-9\s]+(?:grove|road|street|lane|close|way|drive|avenue|place|court|square|gardens?|park|view|heights?|house|building|block|apartment|manor|hall|tower|estate|development|mews|terrace|walk|rise|hill|point|residence|chambers))/gi,
  
  // Standard building patterns
  /(?:house|building|block)\s+([A-Za-z0-9\s]+)/gi,
  /(?:flat|apartment|unit)\s+([A-Za-z0-9\s]+)/gi,
  
  // Tenant/property references
  /(?:tenant|property|leaseholder)\s+(?:at|in|of)\s+([A-Za-z0-9\s]+(?:grove|road|street|lane|close|way|drive|avenue|place|court|square|gardens?|park|view|heights?|house|building|block|apartment|manor|hall|tower|estate|development|mews|terrace|walk|rise|hill|point|residence|chambers))/gi
];

// Unit patterns
const UNIT_PATTERNS = [
  /(?:flat|apartment|unit)\s+([A-Za-z0-9\s]+)/gi,
  /(?:flat|apartment|unit)\s+(\d+)/gi,
  /(?:flat|apartment|unit)\s+([A-Za-z]\d+)/gi
];

/**
 * Extract building and unit names from text
 */
export function extractNamesFromText(text: string): { buildingName?: string; unitName?: string } {
  const result: { buildingName?: string; unitName?: string } = {};
  
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
 * Normalize building/unit names for fuzzy matching
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Calculate similarity between two names
 */
export function calculateSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);
  
  if (norm1 === norm2) return 1.0;
  
  // Simple Levenshtein distance-based similarity
  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  
  return maxLength === 0 ? 1.0 : 1 - (distance / maxLength);
}

/**
 * Simple Levenshtein distance implementation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Resolve building context from text and current context
 */
export function resolveBuildingContext(
  text: string,
  currentContext?: CurrentContext,
  availableBuildings?: Array<{ id: string; name: string }>,
  availableUnits?: Array<{ id: string; name: string; buildingId: string }>
): BuildingContext {
  const extracted = extractNamesFromText(text);
  const result: BuildingContext = {};
  
  // If we have current context and no specific building mentioned, use current context
  if (currentContext?.buildingId && !extracted.buildingName) {
    result.buildingId = currentContext.buildingId;
    result.buildingName = currentContext.buildingName;
  }
  
  // If we have current context and no specific unit mentioned, use current context
  if (currentContext?.unitId && !extracted.unitName) {
    result.unitId = currentContext.unitId;
    result.unitName = currentContext.unitName;
  }
  
  // Try to resolve building name to ID
  if (extracted.buildingName && availableBuildings) {
    const building = findBestMatch(extracted.buildingName, availableBuildings, 'name');
    if (building) {
      result.buildingId = building.id;
      result.buildingName = building.name;
    }
  }
  
  // Try to resolve unit name to ID
  if (extracted.unitName && availableUnits) {
    const unit = findBestMatch(extracted.unitName, availableUnits, 'name');
    if (unit) {
      result.unitId = unit.id;
      result.unitName = unit.name;
      // If we found a unit, also set the building ID
      if (!result.buildingId) {
        result.buildingId = unit.buildingId;
      }
    }
  }
  
  return result;
}

/**
 * Find the best match for a name in a list of objects
 */
function findBestMatch<T extends Record<string, any>>(
  searchName: string,
  items: T[],
  nameField: keyof T,
  threshold: number = 0.7
): T | null {
  let bestMatch: T | null = null;
  let bestScore = 0;
  
  for (const item of items) {
    const itemName = String(item[nameField]);
    const score = calculateSimilarity(searchName, itemName);
    
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = item;
    }
  }
  
  return bestMatch;
}

/**
 * Check if context is complete enough for document lookup
 */
export function isContextComplete(context: BuildingContext): boolean {
  return !!(context.buildingId || context.buildingName);
}

/**
 * Get missing context information
 */
export function getMissingContext(context: BuildingContext): string[] {
  const missing: string[] = [];
  
  if (!context.buildingId && !context.buildingName) {
    missing.push('building');
  }
  
  return missing;
}

/**
 * Format context for display
 */
export function formatContext(context: BuildingContext): string {
  const parts: string[] = [];
  
  if (context.unitName) {
    parts.push(`Unit ${context.unitName}`);
  }
  
  if (context.buildingName) {
    parts.push(context.buildingName);
  }
  
  return parts.join(', ') || 'Unknown location';
}
