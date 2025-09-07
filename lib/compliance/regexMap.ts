import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Types
export interface RegexMapConfig {
  version: number;
  defaults: {
    flags: string;
    uk_date_patterns: string[];
    currency_patterns: string[];
  };
  types: Record<string, DocumentTypeConfig>;
}

export interface DocumentTypeConfig {
  detect: string[];
  fields: Record<string, FieldConfig>;
  compute: ComputeConfig;
  map: MapConfig;
}

export interface FieldConfig {
  patterns: string | string[];
}

export interface ComputeConfig {
  next_due_years?: number;
  next_due_months?: number;
  next_due_rule?: {
    when: string;
    years?: number;
    months?: number;
    yearsFromField?: boolean;
    else_years?: number;
    else_months?: number;
  };
  next_due_hint?: string;
}

export interface MapConfig {
  assessment_type?: string;
  doc_type?: string;
  status_rules?: Array<{
    when: string;
    status: string;
  }>;
}

export interface NormalisedFields {
  [key: string]: any;
  source_pages: number[];
}

export interface SummaryJson {
  doc_type: string;
  assessment_type?: string;
  inspection_date?: string;
  next_due_date?: string;
  result?: string;
  status?: string;
  source_pages: number[];
  [key: string]: any;
}

export interface CompliancePatch {
  assessment_type?: string;
  doc_type?: string;
  last_inspected_at?: string;
  next_due_date?: string;
  status?: string;
  [key: string]: any;
}

export interface DetectionResult {
  type: string;
  score: number;
}

// Global config cache
let configCache: RegexMapConfig | null = null;

/**
 * Load the regex map configuration
 */
export function loadRegexMap(version?: string): RegexMapConfig {
  if (configCache) {
    return configCache;
  }

  const versionToLoad = version || process.env.COMPLIANCE_REGEX_VERSION || 'v1';
  const configPath = path.join(process.cwd(), 'config', 'compliance', `regex-map.${versionToLoad}.yaml`);
  
  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    configCache = yaml.load(fileContents) as RegexMapConfig;
    return configCache;
  } catch (error) {
    console.error(`Failed to load regex map config: ${error}`);
    throw new Error(`Could not load compliance regex map version ${versionToLoad}`);
  }
}

/**
 * Normalize UK date to ISO format (YYYY-MM-DD)
 */
export function normalizeUKDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY
  const pattern1 = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
  const match1 = dateStr.match(pattern1);
  if (match1) {
    const [, day, month, year] = match1;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Pattern 2: DD Month YYYY
  const monthMap: Record<string, string> = {
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12'
  };

  const pattern2 = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/;
  const match2 = dateStr.match(pattern2);
  if (match2) {
    const [, day, month, year] = match2;
    const monthNum = monthMap[month.toLowerCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Apply regex patterns to text and return matches
 */
function applyPatterns(patterns: string | string[], text: string, flags: string = 'gim', config?: RegexMapConfig): Array<{ match: string; page: number }> {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];
  const results: Array<{ match: string; page: number }> = [];

  patternArray.forEach(pattern => {
    try {
      // Handle pattern expansion
      let expandedPatterns = [pattern];
      
      if (pattern === '*uk_date_patterns' && config) {
        expandedPatterns = config.defaults.uk_date_patterns;
      } else if (pattern === '*currency_patterns' && config) {
        expandedPatterns = config.defaults.currency_patterns;
      }

      expandedPatterns.forEach(expandedPattern => {
        const regex = new RegExp(expandedPattern, flags);
        const matches = text.matchAll(regex);
        
        for (const match of matches) {
          if (match[0]) {
            // For now, assume page 1 - in real implementation, this would come from page_map
            results.push({ match: match[0], page: 1 });
          }
        }
      });
    } catch (error) {
      console.warn(`Invalid regex pattern: ${pattern}`, error);
    }
  });

  return results;
}

/**
 * Detect document type from text
 */
export function detectDocType(pageText: string | Array<{ page: number; text: string }>): DetectionResult {
  const config = loadRegexMap();
  const text = Array.isArray(pageText) ? pageText.map(p => p.text).join('\n') : pageText;
  
  let bestMatch: DetectionResult = { type: 'Unknown', score: 0 };

  Object.entries(config.types).forEach(([typeName, typeConfig]) => {
    let score = 0;
    
    // Check detection patterns
    typeConfig.detect.forEach(pattern => {
      const matches = applyPatterns(pattern, text, config.defaults.flags, config);
      score += matches.length * 0.5;
    });

    // Check main fields (inspection_date is usually present)
    if (typeConfig.fields.inspection_date) {
      const dateMatches = applyPatterns(typeConfig.fields.inspection_date, text, config.defaults.flags, config);
      score += dateMatches.length * 1.0;
    }

    // Check other key fields
    Object.entries(typeConfig.fields).forEach(([fieldName, fieldConfig]) => {
      if (fieldName !== 'inspection_date') {
        const fieldMatches = applyPatterns(fieldConfig.patterns, text, config.defaults.flags, config);
        score += fieldMatches.length * 0.3;
      }
    });

    if (score > bestMatch.score) {
      bestMatch = { type: typeName, score };
    }
  });

  return bestMatch;
}

/**
 * Extract fields from page map using document type config
 */
export function extractFields(type: string, pageMap: Array<{ page: number; text: string }>): NormalisedFields {
  const config = loadRegexMap();
  const typeConfig = config.types[type];
  
  if (!typeConfig) {
    return { source_pages: [] };
  }

  const text = pageMap.map(p => p.text).join('\n');
  const fields: NormalisedFields = { source_pages: [] };

  Object.entries(typeConfig.fields).forEach(([fieldName, fieldConfig]) => {
    const matches = applyPatterns(fieldConfig.patterns, text, config.defaults.flags, config);
    
    if (matches.length > 0) {
      // For dates, normalize them
      if (fieldName.includes('date') || fieldName.includes('period')) {
        const normalizedDates = matches
          .map(m => normalizeUKDate(m.match))
          .filter(d => d !== null);
        
        if (normalizedDates.length > 0) {
          fields[fieldName] = normalizedDates[0]; // Take first valid date
          fields.source_pages.push(...matches.map(m => m.page));
        }
      } else {
        // For other fields, take the first match
        fields[fieldName] = matches[0].match;
        fields.source_pages.push(...matches.map(m => m.page));
      }
    }
  });

  // Remove duplicates from source_pages
  fields.source_pages = [...new Set(fields.source_pages)];

  return fields;
}

/**
 * Compute due dates based on document type and extracted fields
 */
export function computeDueDates(type: string, fields: NormalisedFields): { next_due_date?: string } {
  const config = loadRegexMap();
  const typeConfig = config.types[type];
  
  if (!typeConfig || !typeConfig.compute) {
    return {};
  }

  const compute = typeConfig.compute;
  const inspectionDate = fields.inspection_date;

  if (!inspectionDate) {
    return {};
  }

  let nextDueDate: string | undefined;

  // Simple years calculation
  if (compute.next_due_years) {
    const inspection = new Date(inspectionDate);
    inspection.setFullYear(inspection.getFullYear() + compute.next_due_years);
    nextDueDate = inspection.toISOString().split('T')[0];
  }
  
  // Simple months calculation
  else if (compute.next_due_months) {
    const inspection = new Date(inspectionDate);
    inspection.setMonth(inspection.getMonth() + compute.next_due_months);
    nextDueDate = inspection.toISOString().split('T')[0];
  }
  
  // Complex rule-based calculation
  else if (compute.next_due_rule) {
    const rule = compute.next_due_rule;
    
    if (rule.when === 'test_type==\'Annual Duration\'') {
      if (fields.test_type === 'Annual Duration') {
        const inspection = new Date(inspectionDate);
        inspection.setFullYear(inspection.getFullYear() + (rule.years || 1));
        nextDueDate = inspection.toISOString().split('T')[0];
      } else {
        const inspection = new Date(inspectionDate);
        inspection.setMonth(inspection.getMonth() + (rule.else_months || 1));
        nextDueDate = inspection.toISOString().split('T')[0];
      }
    }
    
    else if (rule.when === 'lift_type==\'passenger\'') {
      if (fields.lift_type === 'passenger') {
        const inspection = new Date(inspectionDate);
        inspection.setMonth(inspection.getMonth() + (rule.months || 6));
        nextDueDate = inspection.toISOString().split('T')[0];
      } else {
        const inspection = new Date(inspectionDate);
        inspection.setMonth(inspection.getMonth() + (rule.else_months || 12));
        nextDueDate = inspection.toISOString().split('T')[0];
      }
    }
    
    else if (rule.when === 'reviewYears' && rule.yearsFromField) {
      // Extract years from review field
      const reviewMatch = fields.review?.match(/(\d+)\s+year/);
      if (reviewMatch) {
        const years = parseInt(reviewMatch[1], 10);
        const inspection = new Date(inspectionDate);
        inspection.setFullYear(inspection.getFullYear() + years);
        nextDueDate = inspection.toISOString().split('T')[0];
      } else {
        const inspection = new Date(inspectionDate);
        inspection.setFullYear(inspection.getFullYear() + (rule.else_years || 2));
        nextDueDate = inspection.toISOString().split('T')[0];
      }
    }
  }

  return { next_due_date: nextDueDate };
}

/**
 * Convert to summary JSON format
 */
export function toSummaryJson(type: string, fields: NormalisedFields, due: { next_due_date?: string }): SummaryJson {
  const config = loadRegexMap();
  const typeConfig = config.types[type];
  
  if (!typeConfig) {
    return {
      doc_type: 'unknown',
      source_pages: fields.source_pages || []
    };
  }

  const summary: SummaryJson = {
    doc_type: typeConfig.map.doc_type || 'assessment',
    assessment_type: typeConfig.map.assessment_type,
    inspection_date: fields.inspection_date,
    next_due_date: due.next_due_date,
    source_pages: fields.source_pages || [],
    ...fields
  };

  // Apply status rules
  if (typeConfig.map.status_rules) {
    for (const rule of typeConfig.map.status_rules) {
      if (evaluateStatusRule(rule.when, fields)) {
        summary.status = rule.status;
        break;
      }
    }
  }

  return summary;
}

/**
 * Convert to compliance patch format
 */
export function toCompliancePatch(type: string, fields: NormalisedFields, due: { next_due_date?: string }): CompliancePatch {
  const config = loadRegexMap();
  const typeConfig = config.types[type];
  
  if (!typeConfig) {
    return {};
  }

  const patch: CompliancePatch = {
    assessment_type: typeConfig.map.assessment_type,
    doc_type: typeConfig.map.doc_type,
    last_inspected_at: fields.inspection_date,
    next_due_date: due.next_due_date,
    ...fields
  };

  // Apply status rules
  if (typeConfig.map.status_rules) {
    for (const rule of typeConfig.map.status_rules) {
      if (evaluateStatusRule(rule.when, fields)) {
        patch.status = rule.status;
        break;
      }
    }
  }

  return patch;
}

/**
 * Evaluate status rule conditions
 */
function evaluateStatusRule(condition: string, fields: NormalisedFields): boolean {
  // Simple rule evaluation - in production, you'd want a more robust expression parser
  if (condition === 'true') return true;
  
  if (condition.includes('==')) {
    const [field, value] = condition.split('==').map(s => s.trim().replace(/'/g, ''));
    return fields[field] === value;
  }
  
  if (condition.includes(' in ')) {
    const [field, values] = condition.split(' in ').map(s => s.trim());
    const valueList = values.replace(/[\[\]']/g, '').split(',').map(s => s.trim());
    return valueList.includes(fields[field]);
  }
  
  if (condition.includes('&&')) {
    const parts = condition.split('&&').map(s => s.trim());
    return parts.every(part => evaluateStatusRule(part, fields));
  }
  
  if (condition.includes('||')) {
    const parts = condition.split('||').map(s => s.trim());
    return parts.some(part => evaluateStatusRule(part, fields));
  }
  
  return false;
}

/**
 * Clear config cache (useful for testing)
 */
export function clearConfigCache(): void {
  configCache = null;
}
