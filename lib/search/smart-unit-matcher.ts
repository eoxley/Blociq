// Enhanced search functions for unit number matching

interface LeaseholderData {
  unit_id: string
  unit_number: string
  leaseholder_name: string
  leaseholder_email: string
  leaseholder_phone: string
  correspondence_address: string
  is_director: boolean
  director_role: string
}

// Smart unit number extraction and matching
export class UnitSearchMatcher {
  
  // Extract all possible unit references from a query
  static extractUnitReferences(query: string): string[] {
    const references: string[] = []
    const normalizedQuery = query.toLowerCase()
    
    // Match patterns like:
    // "flat 5", "unit 5", "apartment 5", "5", "flat5"
    const unitPatterns = [
      /(?:flat|unit|apartment)\s*(\d+)/g,
      /(?:^|\s)(\d+)(?:\s|$)/g,  // standalone numbers
      /(?:flat|unit|apartment)(\d+)/g  // no space
    ]
    
    unitPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(normalizedQuery)) !== null) {
        references.push(match[1])
      }
    })
    
    // Also extract full phrases like "flat 5"
    const fullPatterns = [
      /flat\s*\d+/g,
      /unit\s*\d+/g,
      /apartment\s*\d+/g
    ]
    
    fullPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(normalizedQuery)) !== null) {
        references.push(match[0].replace(/\s+/g, ' ').trim())
      }
    })
    
    return [...new Set(references)] // Remove duplicates
  }
  
  // Find matching units with flexible matching
  static findMatchingUnits(data: LeaseholderData[], query: string): LeaseholderData[] {
    const unitRefs = this.extractUnitReferences(query)
    const matches: LeaseholderData[] = []
    const normalizedQuery = query.toLowerCase()
    
    console.log('Extracted unit references:', unitRefs)
    
    data.forEach(record => {
      const unitNumber = record.unit_number.toLowerCase()
      let isMatch = false
      
      // 1. Exact unit reference match
      unitRefs.forEach(ref => {
        if (unitNumber.includes(ref.toLowerCase())) {
          isMatch = true
        }
        
        // Handle "5" -> "flat 5" conversion
        if (ref.match(/^\d+$/) && unitNumber === `flat ${ref}`) {
          isMatch = true
        }
        
        // Handle "flat 5" -> exact match
        if (ref.toLowerCase() === unitNumber) {
          isMatch = true
        }
      })
      
      // 2. Direct unit number substring match
      if (unitNumber.includes(normalizedQuery) || normalizedQuery.includes(unitNumber)) {
        isMatch = true
      }
      
      // 3. Address-based matching
      if (record.correspondence_address?.toLowerCase().includes(normalizedQuery)) {
        isMatch = true
      }
      
      if (isMatch && !matches.find(m => m.unit_id === record.unit_id)) {
        matches.push(record)
      }
    })
    
    return matches
  }
  
  // Get suggestions for "did you mean" when no exact match
  static getSuggestions(data: LeaseholderData[], query: string): string[] {
    const suggestions: string[] = []
    const unitRefs = this.extractUnitReferences(query)
    
    if (unitRefs.length > 0) {
      const searchNumber = unitRefs[0]
      
      // Find similar unit numbers
      const availableUnits = data.map(d => d.unit_number).sort()
      
      // Suggest units with similar numbers
      availableUnits.forEach(unit => {
        const unitNum = unit.match(/\d+/)?.[0]
        if (unitNum && Math.abs(parseInt(unitNum) - parseInt(searchNumber)) <= 2) {
          suggestions.push(unit)
        }
      })
      
      // If no close matches, suggest some existing units
      if (suggestions.length === 0) {
        suggestions.push(...availableUnits.slice(0, 5))
      }
    }
    
    return [...new Set(suggestions)].slice(0, 5)
  }
}

// Enhanced AI search function
export async function searchWithSmartMatching(data: LeaseholderData[], query: string) {
  console.log(`Smart search for: "${query}"`)
  
  // 1. Try smart unit matching first
  const unitMatches = UnitSearchMatcher.findMatchingUnits(data, query)
  
  if (unitMatches.length > 0) {
    console.log(`Found ${unitMatches.length} unit matches`)
    return {
      matches: unitMatches,
      type: 'unit_match',
      suggestions: []
    }
  }
  
  // 2. Try broader search (names, emails, etc.)
  const broadMatches = data.filter(record => {
    const searchText = [
      record.unit_number,
      record.leaseholder_name,
      record.leaseholder_email,
      record.correspondence_address
    ].filter(Boolean).join(' ').toLowerCase()
    
    return query.toLowerCase().split(/\s+/).some(term => 
      searchText.includes(term)
    )
  })
  
  if (broadMatches.length > 0) {
    return {
      matches: broadMatches,
      type: 'broad_match',
      suggestions: []
    }
  }
  
  // 3. No matches found - provide suggestions
  const suggestions = UnitSearchMatcher.getSuggestions(data, query)
  
  return {
    matches: [],
    type: 'no_match',
    suggestions
  }
}

export type { LeaseholderData }