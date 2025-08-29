/**
 * Unified query parsing utilities for AI endpoints
 * Consolidates property query detection and intent parsing across all routes
 */

export interface QueryIntent {
  type: 'leaseholder_lookup' | 'unit_details' | 'building_info' | 'document_query' | 'buildings_list' | 'access_codes' | 'general';
  buildingIdentifier?: string;
  unitIdentifier?: string;
  personName?: string;
  confidence: number;
  keywords?: string[];
}

/**
 * Parse query to determine intent and extract identifiers
 */
export function parseQueryIntent(query: string): QueryIntent {
  const queryLower = query.toLowerCase();
  
  // Enhanced building identifiers with better pattern matching
  const buildingPatterns = [
    /([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+(?:house|court|place|tower|manor|lodge|building)\b/i,
    /building\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/,
    /([a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s+building/,
    /at\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/,
    /property\s+([a-zA-Z0-9\s]+?)(?:\s|$|,|\?)/,
    /(\d+\s+\w+(?:\s+\w+)*?)(?:\s+building|$|\s+house|\s+court|\s+place)/
  ];
  
  // Enhanced unit identifiers with better extraction
  const unitPatterns = [
    /(?:unit|flat|apartment|apt)\s*([0-9]+[a-zA-Z]?)/i,
    /(?:^|\s|of\s+|in\s+)([0-9]+[a-zA-Z]?)(?:\s+(?:ashwood|at|building)|$|\s)/,
    /number\s+([0-9]+[a-zA-Z]?)/i,
    /([0-9]+[a-zA-Z]?)\s+(?:ashwood|at)/i
  ];
  
  // Enhanced person name patterns
  const namePatterns = [
    /(?:who is|who's)\s+(?:the\s+)?(?:leaseholder|tenant|resident)(?:\s+(?:of|in|for))?\s+(.+?)(?:\?|$)/i,
    /leaseholder\s+(?:of|in|for)\s+(.+?)(?:\?|$)/i,
    /(?:tenant|resident)\s+(?:of|in|at)\s+(.+?)(?:\?|$)/i
  ];

  // Extract keywords for relevance scoring
  const keywords = queryLower.split(/\s+/).filter(word => word.length > 2);

  let intent: QueryIntent = { 
    type: 'general', 
    confidence: 0.3,
    keywords 
  };
  
  // Building list queries
  if (queryLower.includes('what buildings') || queryLower.includes('list buildings') ||
      queryLower.includes('buildings do i manage') || queryLower.includes('my buildings') ||
      queryLower.includes('show buildings') || queryLower.includes('all buildings')) {
    return {
      type: 'buildings_list',
      confidence: 0.9,
      keywords
    };
  }
  
  // Access codes queries
  if ((queryLower.includes('access') || queryLower.includes('code') || 
       queryLower.includes('entry') || queryLower.includes('door')) &&
      (queryLower.includes('code') || queryLower.includes('codes'))) {
    return {
      type: 'access_codes',
      buildingIdentifier: extractBestMatch(query, buildingPatterns),
      confidence: 0.8,
      keywords
    };
  }
  
  // Leaseholder lookup patterns
  if (queryLower.includes('leaseholder') || queryLower.includes('who is') || 
      queryLower.includes('tenant') || queryLower.includes('resident')) {
    intent = {
      type: 'leaseholder_lookup',
      buildingIdentifier: extractBestMatch(query, buildingPatterns),
      unitIdentifier: extractBestMatch(query, unitPatterns),
      personName: extractBestMatch(query, namePatterns),
      confidence: 0.9,
      keywords
    };
  }
  // Unit details patterns
  else if (queryLower.includes('unit') || queryLower.includes('flat') || 
           queryLower.includes('apartment') || queryLower.includes('property details')) {
    intent = {
      type: 'unit_details',
      buildingIdentifier: extractBestMatch(query, buildingPatterns),
      unitIdentifier: extractBestMatch(query, unitPatterns),
      confidence: 0.8,
      keywords
    };
  }
  // Building info patterns
  else if (queryLower.includes('building') || queryLower.includes('address') ||
           queryLower.includes('property') || queryLower.includes('information about')) {
    intent = {
      type: 'building_info',
      buildingIdentifier: extractBestMatch(query, buildingPatterns),
      confidence: 0.7,
      keywords
    };
  }
  // Document queries
  else if (queryLower.includes('document') || queryLower.includes('lease') ||
           queryLower.includes('contract') || queryLower.includes('agreement')) {
    intent = {
      type: 'document_query',
      buildingIdentifier: extractBestMatch(query, buildingPatterns),
      unitIdentifier: extractBestMatch(query, unitPatterns),
      confidence: 0.6,
      keywords
    };
  }
  
  return intent;
}

/**
 * Determine if a query is property-related and should trigger database search
 */
export function isPropertyQuery(query: string): boolean {
  if (!query || typeof query !== 'string') return false;
  
  const queryLower = query.toLowerCase();
  
  const propertyKeywords = [
    'leaseholder', 'tenant', 'unit', 'flat', 'building', 'house',
    'access', 'code', 'security', 'email', 'phone', 'contact',
    'works', 'compliance', 'maintenance', 'service charge',
    'director', 'ground rent', 'property', 'address',
    'ashwood', 'oak court', 'communication', 'notice',
    'resident', 'occupier', 'landlord', 'lessor', 'lessee'
  ];
  
  // Check for direct keyword matches
  const hasPropertyKeywords = propertyKeywords.some(keyword => 
    queryLower.includes(keyword)
  );
  
  // Check for unit number patterns (e.g., "unit 5", "flat 3A")
  const hasUnitPattern = /(?:unit|flat|apartment|apt)\s*[0-9]+[a-zA-Z]?/i.test(query);
  
  // Check for building name patterns (e.g., "Ashwood House")
  const hasBuildingPattern = /\b\w+\s+(?:house|court|place|tower|manor|lodge|building)\b/i.test(query);
  
  // Check for "who" questions (likely about people/leaseholders)
  const hasWhoPattern = /\bwho\s+(?:is|lives|owns|manages)/i.test(query);
  
  return hasPropertyKeywords || hasUnitPattern || hasBuildingPattern || hasWhoPattern;
}

/**
 * Extract the best matching string from text using provided patterns
 */
function extractBestMatch(text: string, patterns: RegExp[]): string | undefined {
  const matches: { match: string; confidence: number }[] = [];
  
  for (const pattern of patterns) {
    try {
      // Handle existing flags properly
      const existingFlags = pattern.flags || '';
      const flags = existingFlags.includes('g') ? existingFlags : existingFlags + 'g';
      const regex = new RegExp(pattern.source, flags);
      const regexMatches = Array.from(text.matchAll(regex));
      
      for (const regexMatch of regexMatches) {
        const extractedMatch = regexMatch[1] || regexMatch[0];
        if (extractedMatch && extractedMatch.trim()) {
          let confidence = 0.5;
          
          // Higher confidence for more specific patterns
          if (pattern.source.includes('building|house|court|place')) confidence += 0.3;
          if (pattern.source.includes('unit|flat|apartment')) confidence += 0.3;
          if (pattern.source.includes('at\\s+')) confidence += 0.2;
          
          // Higher confidence for longer matches
          if (extractedMatch.length > 5) confidence += 0.1;
          if (extractedMatch.length > 10) confidence += 0.1;
          
          matches.push({ 
            match: extractedMatch.trim(), 
            confidence: Math.min(confidence, 1.0)
          });
        }
      }
    } catch (regexError) {
      console.warn('RegExp error with pattern:', pattern.source, regexError);
      continue;
    }
  }
  
  if (matches.length === 0) return undefined;
  
  // Return the match with highest confidence
  matches.sort((a, b) => b.confidence - a.confidence);
  return matches[0].match;
}

/**
 * Check if query is document-related
 */
export function isDocumentQuery(query: string): boolean {
  if (!query || typeof query !== 'string') return false;
  
  const queryLower = query.toLowerCase();
  const documentKeywords = [
    'document', 'lease', 'contract', 'agreement', 'report', 'certificate',
    'assessment', 'survey', 'inspection', 'compliance', 'policy', 'notice',
    'letter', 'correspondence', 'file', 'upload', 'scan', 'pdf', 'text',
    'content', 'summary', 'extract', 'analyze', 'review', 'read'
  ];
  
  return documentKeywords.some(keyword => queryLower.includes(keyword));
}

/**
 * Determine query priority for routing decisions
 */
export function getQueryPriority(query: string): 'high' | 'medium' | 'low' {
  const intent = parseQueryIntent(query);
  
  if (intent.confidence >= 0.8) return 'high';
  if (intent.confidence >= 0.6) return 'medium';
  return 'low';
}

/**
 * Extract building and unit identifiers from query
 */
export function extractPropertyIdentifiers(query: string): {
  building?: string;
  unit?: string;
  confidence: number;
} {
  const intent = parseQueryIntent(query);
  
  return {
    building: intent.buildingIdentifier,
    unit: intent.unitIdentifier,
    confidence: intent.confidence
  };
}