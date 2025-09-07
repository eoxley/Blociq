/**
 * EICR (Electrical Installation Condition Report) parser
 * Extracts key information from EICR documents
 */

export interface EICRSummary {
  doc_type: 'assessment';
  assessment_type: 'EICR';
  inspection_date: string;
  valid_years: number;
  next_due_date: string;
  findings: Array<{
    code: string;
    count: number;
    description?: string;
  }>;
  result: 'satisfactory' | 'unsatisfactory' | 'no_c1';
  source_pages: number[];
  building_name?: string;
  inspector_name?: string;
  installation_address?: string;
}

/**
 * Parse EICR document text
 */
export function parseEICR(text: string): EICRSummary {
  console.log('🔍 Parsing EICR document...');
  
  const normalizedText = text.replace(/\s+/g, ' ').toLowerCase();
  
  // Extract inspection date
  const inspectionDate = extractInspectionDate(text);
  
  // Extract validity period
  const validYears = extractValidityPeriod(text);
  
  // Calculate next due date
  const nextDueDate = calculateNextDueDate(inspectionDate, validYears);
  
  // Extract findings
  const findings = extractFindings(text);
  
  // Determine result
  const result = determineResult(findings);
  
  // Extract building name
  const buildingName = extractBuildingName(text);
  
  // Extract inspector name
  const inspectorName = extractInspectorName(text);
  
  // Extract installation address
  const installationAddress = extractInstallationAddress(text);
  
  const summary: EICRSummary = {
    doc_type: 'assessment',
    assessment_type: 'EICR',
    inspection_date: inspectionDate,
    valid_years: validYears,
    next_due_date: nextDueDate,
    findings,
    result,
    source_pages: [1], // Default to page 1
    building_name: buildingName,
    inspector_name: inspectorName,
    installation_address: installationAddress
  };
  
  console.log('✅ EICR parsed:', summary);
  return summary;
}

/**
 * Extract inspection date from text
 */
function extractInspectionDate(text: string): string {
  // Look for various date patterns
  const datePatterns = [
    /(?:inspection|tested|examined).*?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:date|dated).*?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i,
    /(\d{1,2}\s+\d{1,2}\s+\d{2,4})/,
    /(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const dateStr = match[1];
      const parsedDate = parseDateString(dateStr);
      if (parsedDate) {
        return parsedDate;
      }
    }
  }
  
  // Default to current date if not found
  return new Date().toISOString().split('T')[0];
}

/**
 * Extract validity period from text
 */
function extractValidityPeriod(text: string): number {
  const patterns = [
    /valid.*?(\d+)\s*years?/i,
    /validity.*?(\d+)\s*years?/i,
    /next.*?inspection.*?(\d+)\s*years?/i,
    /due.*?(\d+)\s*years?/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const years = parseInt(match[1]);
      if (years > 0 && years <= 10) {
        return years;
      }
    }
  }
  
  // Default to 5 years
  return 5;
}

/**
 * Calculate next due date
 */
function calculateNextDueDate(inspectionDate: string, validYears: number): string {
  try {
    const date = new Date(inspectionDate);
    date.setFullYear(date.getFullYear() + validYears);
    return date.toISOString().split('T')[0];
  } catch (error) {
    // Fallback: add 5 years to current date
    const date = new Date();
    date.setFullYear(date.getFullYear() + 5);
    return date.toISOString().split('T')[0];
  }
}

/**
 * Extract findings from text
 */
function extractFindings(text: string): Array<{code: string; count: number; description?: string}> {
  const findings: Array<{code: string; count: number; description?: string}> = [];
  
  // Look for category patterns
  const categoryPatterns = [
    /(?:category|c1|c2|c3|code)\s*1[:\s]*(\d+)/gi,
    /(?:category|c1|c2|c3|code)\s*2[:\s]*(\d+)/gi,
    /(?:category|c1|c2|c3|code)\s*3[:\s]*(\d+)/gi,
    /(?:fi|f1)[:\s]*(\d+)/gi,
    /(?:f2)[:\s]*(\d+)/gi,
    /(?:f3)[:\s]*(\d+)/gi
  ];
  
  const categoryCodes = ['C1', 'C2', 'C3', 'F1', 'F2', 'F3'];
  
  for (let i = 0; i < categoryPatterns.length; i++) {
    const pattern = categoryPatterns[i];
    const code = categoryCodes[i];
    
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      const totalCount = matches.reduce((sum, match) => sum + parseInt(match[1] || '0'), 0);
      if (totalCount > 0) {
        findings.push({
          code,
          count: totalCount,
          description: getCategoryDescription(code)
        });
      }
    }
  }
  
  // If no specific findings, check for "no issues" or "satisfactory"
  if (findings.length === 0) {
    const noIssuesPatterns = [
      /no\s+category\s+1/i,
      /no\s+c1/i,
      /satisfactory/i,
      /no\s+defects/i,
      /no\s+issues/i
    ];
    
    const hasNoIssues = noIssuesPatterns.some(pattern => pattern.test(text));
    if (hasNoIssues) {
      findings.push({
        code: 'C1',
        count: 0,
        description: 'No Category 1 issues found'
      });
    }
  }
  
  return findings;
}

/**
 * Determine overall result
 */
function determineResult(findings: Array<{code: string; count: number}>): 'satisfactory' | 'unsatisfactory' | 'no_c1' {
  const c1Count = findings.find(f => f.code === 'C1')?.count || 0;
  const c2Count = findings.find(f => f.code === 'C2')?.count || 0;
  
  if (c1Count === 0 && c2Count === 0) {
    return 'no_c1';
  } else if (c1Count === 0) {
    return 'satisfactory';
  } else {
    return 'unsatisfactory';
  }
}

/**
 * Extract building name
 */
function extractBuildingName(text: string): string | undefined {
  const patterns = [
    /(?:property|building|premises|address)[:\s]*([^\n\r]{10,50})/i,
    /([A-Z][a-z]+\s+(?:House|Building|Court|Manor|Place|Square|Road|Street|Avenue|Close|Way|Lane))/i,
    /(?:at|of)\s+([A-Z][a-z]+\s+(?:House|Building|Court|Manor|Place|Square|Road|Street|Avenue|Close|Way|Lane))/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (name.length > 5 && name.length < 100) {
        return name;
      }
    }
  }
  
  return undefined;
}

/**
 * Extract inspector name
 */
function extractInspectorName(text: string): string | undefined {
  const patterns = [
    /(?:inspector|engineer|tester)[:\s]*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /(?:signed|by)[:\s]*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /(?:name)[:\s]*([A-Z][a-z]+\s+[A-Z][a-z]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (name.length > 5 && name.length < 50) {
        return name;
      }
    }
  }
  
  return undefined;
}

/**
 * Extract installation address
 */
function extractInstallationAddress(text: string): string | undefined {
  const patterns = [
    /(?:address|location)[:\s]*([^\n\r]{20,100})/i,
    /(?:installation|premises)[:\s]*([^\n\r]{20,100})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const address = match[1].trim();
      if (address.length > 10 && address.length < 200) {
        return address;
      }
    }
  }
  
  return undefined;
}

/**
 * Parse date string to ISO format
 */
function parseDateString(dateStr: string): string | null {
  try {
    // Handle various date formats
    let date: Date;
    
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const fullYear = year.length === 2 ? `20${year}` : year;
        date = new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts;
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    } else if (dateStr.includes(' ')) {
      // Try parsing as "DD Month YYYY"
      date = new Date(dateStr);
    } else {
      date = new Date(dateStr);
    }
    
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    return null;
  }
}

/**
 * Get category description
 */
function getCategoryDescription(code: string): string {
  const descriptions: { [key: string]: string } = {
    'C1': 'Category 1 - Danger present',
    'C2': 'Category 2 - Potentially dangerous',
    'C3': 'Category 3 - Improvement recommended',
    'F1': 'Further investigation required',
    'F2': 'Further investigation required',
    'F3': 'Further investigation required'
  };
  
  return descriptions[code] || 'Electrical issue';
}
