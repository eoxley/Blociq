/**
 * Query Normalizer for UK Leasehold Block Management
 * Converts tenant terminology to leaseholder unless clearly AST/commercial
 */

export function normaliseQueryForLeasehold(query: string): string {
  /**
   * Normalise terminology so AI interprets correctly.
   * Converts 'tenant' to 'leaseholder' unless clearly AST/commercial.
   */
  
  // Quick exclusions – don't touch these contexts
  const exclusions = [
    'AST',
    'assured shorthold',
    'commercial lease',
    'business tenant',
    'commercial tenant',
    'private rental',
    'rental agreement',
    'tenancy agreement',
    'housing act',
    'section 21 notice',
    'possession order'
  ];
  
  const queryLower = query.toLowerCase();
  
  // Check if this is clearly about AST/commercial tenancies
  const isExcluded = exclusions.some(exclusion => queryLower.includes(exclusion.toLowerCase()));
  
  if (isExcluded) {
    console.log('🔍 [QueryNormalizer] Excluded context detected, keeping original terminology');
    return query; // Don't touch
  }
  
  // Normalise tenant → leaseholder
  let normalisedQuery = query;
  
  // Replace with word boundaries to avoid partial matches
  normalisedQuery = normalisedQuery.replace(/\btenants\b/gi, 'leaseholders');
  normalisedQuery = normalisedQuery.replace(/\btenant\b/gi, 'leaseholder');
  
  // Handle common variations
  normalisedQuery = normalisedQuery.replace(/\bTenants\b/g, 'Leaseholders');
  normalisedQuery = normalisedQuery.replace(/\bTenant\b/g, 'Leaseholder');
  normalisedQuery = normalisedQuery.replace(/\bTENANTS\b/g, 'LEASEHOLDERS');
  normalisedQuery = normalisedQuery.replace(/\bTENANT\b/g, 'LEASEHOLDER');
  
  // Log the transformation
  if (normalisedQuery !== query) {
    console.log('🔄 [QueryNormalizer] Normalised query:', {
      original: query,
      normalised: normalisedQuery,
      changes: 'tenant → leaseholder'
    });
  }
  
  return normalisedQuery;
}

/**
 * Check if query is about leasehold block management
 */
export function isLeaseholdQuery(query: string): boolean {
  const leaseholdKeywords = [
    'service charge',
    'leaseholder',
    'block management',
    'leasehold',
    'freeholder',
    'management company',
    'section 20',
    'section 21',
    'section 22',
    'major works',
    'building safety',
    'fire risk assessment',
    'compliance',
    'ground rent',
    'lease term',
    'demised premises',
    'right to manage',
    'rtm'
  ];
  
  const queryLower = query.toLowerCase();
  return leaseholdKeywords.some(keyword => queryLower.includes(keyword));
}

/**
 * Get context type based on query content
 */
export function getQueryContextType(query: string): 'leasehold' | 'commercial' | 'ast' | 'general' {
  const queryLower = query.toLowerCase();
  
  // Check for commercial context
  if (queryLower.includes('commercial') || queryLower.includes('business tenant')) {
    return 'commercial';
  }
  
  // Check for AST context
  if (queryLower.includes('ast') || queryLower.includes('assured shorthold') || queryLower.includes('private rental')) {
    return 'ast';
  }
  
  // Check for leasehold context
  if (isLeaseholdQuery(query)) {
    return 'leasehold';
  }
  
  return 'general';
}

/**
 * Add leasehold context prefix to query
 */
export function addLeaseholdContext(query: string): string {
  const contextType = getQueryContextType(query);
  
  if (contextType === 'leasehold') {
    return `[UK Leasehold Block Management Context] ${query}`;
  }
  
  return query;
}
