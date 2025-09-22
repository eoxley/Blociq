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
  contractor?: string;
  certificate_number?: string;
  overall_condition?: string;
  recommendations?: string[];
  observations?: string[];
  contractor_contact?: string;
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
  
  // Extract contractor information
  const contractor = extractContractor(text);
  const contractorContact = extractContractorContact(text);
  
  // Extract certificate number
  const certificateNumber = extractCertificateNumber(text);
  
  // Extract overall condition
  const overallCondition = extractOverallCondition(text);
  
  // Extract recommendations and observations
  const recommendations = extractRecommendations(text);
  const observations = extractObservations(text);
  
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
    installation_address: installationAddress,
    contractor,
    certificate_number: certificateNumber,
    overall_condition: overallCondition,
    recommendations,
    observations,
    contractor_contact: contractorContact
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
 * Extract contractor information
 */
function extractContractor(text: string): string | undefined {
  const patterns = [
    /(?:contractor|company|firm)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /(?:electrical|electrical contractor)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /(?:signed by|prepared by)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const contractor = match[1].trim();
      if (contractor.length > 3 && contractor.length < 100) {
        return contractor;
      }
    }
  }
  
  return undefined;
}

/**
 * Extract contractor contact information
 */
function extractContractorContact(text: string): string | undefined {
  const patterns = [
    /(?:contact|phone|tel)[:\s]*([0-9\s\-\+\(\)]{10,20})/i,
    /(?:email)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /(?:address)[:\s]*([^\n\r]{20,100})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const contact = match[1].trim();
      if (contact.length > 5 && contact.length < 200) {
        return contact;
      }
    }
  }
  
  return undefined;
}

/**
 * Extract certificate number
 */
function extractCertificateNumber(text: string): string | undefined {
  const patterns = [
    /(?:certificate|cert|ref|reference)[:\s]*([A-Z0-9\-]{5,20})/i,
    /(?:report|eicr)[:\s]*([A-Z0-9\-]{5,20})/i,
    /(?:no|number)[:\s]*([A-Z0-9\-]{5,20})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const certNumber = match[1].trim();
      if (certNumber.length > 3 && certNumber.length < 50) {
        return certNumber;
      }
    }
  }
  
  return undefined;
}

/**
 * Extract overall condition
 */
function extractOverallCondition(text: string): string | undefined {
  const patterns = [
    /(?:overall|general|condition)[:\s]*(satisfactory|unsatisfactory|good|poor|excellent|fair)/i,
    /(?:result|outcome)[:\s]*(satisfactory|unsatisfactory|good|poor|excellent|fair)/i,
    /(?:assessment|evaluation)[:\s]*(satisfactory|unsatisfactory|good|poor|excellent|fair)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].toLowerCase();
    }
  }
  
  return undefined;
}

/**
 * Extract recommendations
 */
function extractRecommendations(text: string): string[] {
  const recommendations: string[] = [];
  
  const patterns = [
    /(?:recommend|suggest|advise)[:\s]*([^\n\r]{20,200})/gi,
    /(?:action required|must|should)[:\s]*([^\n\r]{20,200})/gi,
    /(?:improvement|enhancement)[:\s]*([^\n\r]{20,200})/gi
  ];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const rec = match[1].trim();
      if (rec.length > 10 && rec.length < 300) {
        recommendations.push(rec);
      }
    }
  }
  
  return recommendations.slice(0, 10); // Limit to 10 recommendations
}

/**
 * Extract observations
 */
function extractObservations(text: string): string[] {
  const observations: string[] = [];
  
  const patterns = [
    /(?:observe|note|found|discovered)[:\s]*([^\n\r]{20,200})/gi,
    /(?:condition|state|status)[:\s]*([^\n\r]{20,200})/gi,
    /(?:inspection|examination)[:\s]*([^\n\r]{20,200})/gi
  ];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const obs = match[1].trim();
      if (obs.length > 10 && obs.length < 300) {
        observations.push(obs);
      }
    }
  }
  
  return observations.slice(0, 10); // Limit to 10 observations
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
