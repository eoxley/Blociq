/**
 * Report Intent Detection for Ask BlocIQ
 * Detects natural language requests for reports and data summaries
 */

export interface ReportIntent {
  kind: 'GET_REPORT';
  subject: string;
  scope: 'building' | 'unit' | 'agency';
  buildingId?: string;
  unitId?: string;
  period: {
    since: string;
    until?: string;
  };
  format: 'table' | 'csv' | 'pdf';
  rawText: string;
  confidence: number;
}

// Report action words
const REPORT_ACTION_WORDS = [
  'report', 'summary', 'overview', 'dashboard', 'list', 'table', 'export',
  'show', 'get', 'generate', 'create', 'display', 'view'
];

// Report subjects mapping
const REPORT_SUBJECTS = {
  'compliance': ['compliance', 'compliant', 'non-compliant', 'overdue', 'upcoming'],
  'eicr': ['eicr', 'electrical', 'electrical report', 'electrical installation'],
  'fra': ['fra', 'fire risk', 'fire risk assessment', 'fire safety'],
  'ews1': ['ews1', 'ews', 'external wall', 'external wall system', 'fraew'],
  'insurance': ['insurance', 'policy', 'policy schedule', 'insurance schedule'],
  'documents': ['documents', 'docs', 'files', 'paperwork'],
  'emails': ['emails', 'messages', 'communications'],
  'overdue': ['overdue', 'late', 'expired', 'past due'],
  'upcoming': ['upcoming', 'due soon', 'scheduled', 'pending']
};

// Scope indicators
const SCOPE_INDICATORS = {
  'building': ['building', 'house', 'block', 'property'],
  'unit': ['unit', 'flat', 'apartment', 'tenancy'],
  'agency': ['portfolio', 'all buildings', 'agency', 'company', 'everywhere']
};

// Period indicators
const PERIOD_INDICATORS = {
  'today': ['today', 'this day'],
  'yesterday': ['yesterday', 'yesterday\'s'],
  'this week': ['this week', 'current week', 'week to date'],
  'last week': ['last week', 'previous week'],
  'this month': ['this month', 'current month', 'month to date'],
  'last month': ['last month', 'previous month'],
  'this quarter': ['this quarter', 'current quarter', 'quarter to date'],
  'last quarter': ['last quarter', 'previous quarter'],
  'ytd': ['ytd', 'year to date', 'this year', 'current year'],
  'custom': ['from', 'to', 'between', 'since', 'until']
};

// Format indicators
const FORMAT_INDICATORS = {
  'csv': ['csv', 'spreadsheet', 'excel', 'download'],
  'pdf': ['pdf', 'document', 'print'],
  'table': ['table', 'list', 'view', 'display']
};

/**
 * Extract building/unit context from text
 */
function extractBuildingContext(text: string): { buildingName?: string; unitName?: string } {
  const buildingPatterns = [
    /(?:for|of|at|in)\s+([A-Za-z0-9\s]+?)(?:\s+(?:house|building|block|property))/gi,
    /(?:house|building|block|property)\s+([A-Za-z0-9\s]+)/gi
  ];
  
  const unitPatterns = [
    /(?:flat|apartment|unit)\s+([A-Za-z0-9\s]+)/gi,
    /(?:flat|apartment|unit)\s+(\d+)/gi
  ];
  
  let buildingName = '';
  let unitName = '';
  
  for (const pattern of buildingPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      buildingName = matches[0][1]?.trim();
      break;
    }
  }
  
  for (const pattern of unitPatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      unitName = matches[0][1]?.trim();
      break;
    }
  }
  
  return { buildingName, unitName };
}

/**
 * Detect report subject from text
 */
function detectSubject(text: string): { subject: string; confidence: number } {
  const lowerText = text.toLowerCase();
  let bestSubject = '';
  let bestScore = 0;
  
  for (const [subject, keywords] of Object.entries(REPORT_SUBJECTS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        const score = keyword.length / lowerText.length;
        if (score > bestScore) {
          bestScore = score;
          bestSubject = subject;
        }
      }
    }
  }
  
  return {
    subject: bestSubject || 'compliance',
    confidence: bestScore
  };
}

/**
 * Detect scope from text
 */
function detectScope(text: string): 'building' | 'unit' | 'agency' {
  const lowerText = text.toLowerCase();
  
  // Check for unit indicators first
  for (const keyword of SCOPE_INDICATORS.unit) {
    if (lowerText.includes(keyword)) {
      return 'unit';
    }
  }
  
  // Check for building indicators
  for (const keyword of SCOPE_INDICATORS.building) {
    if (lowerText.includes(keyword)) {
      return 'building';
    }
  }
  
  // Check for agency indicators
  for (const keyword of SCOPE_INDICATORS.agency) {
    if (lowerText.includes(keyword)) {
      return 'agency';
    }
  }
  
  // Default to building if no specific scope detected
  return 'building';
}

/**
 * Detect period from text
 */
function detectPeriod(text: string): { since: string; until?: string } {
  const lowerText = text.toLowerCase();
  
  // Check for specific period indicators
  for (const [period, keywords] of Object.entries(PERIOD_INDICATORS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        switch (period) {
          case 'today':
            return { since: new Date().toISOString().split('T')[0] };
          case 'yesterday':
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return { since: yesterday.toISOString().split('T')[0] };
          case 'this week':
            const startOfWeek = new Date();
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            return { since: startOfWeek.toISOString().split('T')[0] };
          case 'this month':
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            return { since: startOfMonth.toISOString().split('T')[0] };
          case 'this quarter':
            const startOfQuarter = new Date();
            const quarter = Math.floor(startOfQuarter.getMonth() / 3);
            startOfQuarter.setMonth(quarter * 3, 1);
            return { since: startOfQuarter.toISOString().split('T')[0] };
          case 'ytd':
            const startOfYear = new Date();
            startOfYear.setMonth(0, 1);
            return { since: startOfYear.toISOString().split('T')[0] };
        }
      }
    }
  }
  
  // Check for custom date ranges
  const dateRangePattern = /(?:from|since)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:to|until)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i;
  const dateRangeMatch = text.match(dateRangePattern);
  if (dateRangeMatch) {
    const [, since, until] = dateRangeMatch;
    return {
      since: parseCustomDate(since),
      until: parseCustomDate(until)
    };
  }
  
  // Check for single date
  const singleDatePattern = /(?:from|since)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i;
  const singleDateMatch = text.match(singleDatePattern);
  if (singleDateMatch) {
    return { since: parseCustomDate(singleDateMatch[1]) };
  }
  
  // Default to this quarter
  const startOfQuarter = new Date();
  const quarter = Math.floor(startOfQuarter.getMonth() / 3);
  startOfQuarter.setMonth(quarter * 3, 1);
  return { since: startOfQuarter.toISOString().split('T')[0] };
}

/**
 * Parse custom date format (DD/MM/YYYY or DD-MM-YYYY)
 */
function parseCustomDate(dateStr: string): string {
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

/**
 * Detect format from text
 */
function detectFormat(text: string): 'table' | 'csv' | 'pdf' {
  const lowerText = text.toLowerCase();
  
  for (const [format, keywords] of Object.entries(FORMAT_INDICATORS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return format as 'table' | 'csv' | 'pdf';
      }
    }
  }
  
  return 'table';
}

/**
 * Check if text contains report action words
 */
function hasReportActionWords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return REPORT_ACTION_WORDS.some(word => lowerText.includes(word));
}

/**
 * Calculate confidence score for report intent
 */
function calculateConfidence(text: string, subject: string, scope: string): number {
  let score = 0;
  const lowerText = text.toLowerCase();
  
  // Action words boost
  if (hasReportActionWords(lowerText)) {
    score += 0.3;
  }
  
  // Subject specificity
  if (subject !== 'compliance') {
    score += 0.2;
  }
  
  // Scope specificity
  if (scope !== 'building') {
    score += 0.1;
  }
  
  // Period specificity
  if (lowerText.includes('this') || lowerText.includes('last') || lowerText.includes('quarter') || lowerText.includes('month')) {
    score += 0.2;
  }
  
  // Format specificity
  if (lowerText.includes('csv') || lowerText.includes('pdf') || lowerText.includes('export')) {
    score += 0.2;
  }
  
  return Math.min(score, 1.0);
}

/**
 * Detect report intent from user input
 */
export function detectReportIntent(
  text: string,
  currentBuildingId?: string,
  currentUnitId?: string
): ReportIntent | null {
  // CRITICAL: Exclude email drafting/writing requests
  // These should be handled by email response system, not report generation
  const lowerText = text.toLowerCase();
  const emailDraftingIndicators = [
    /\b(write|draft|compose|create|generate|respond|reply)\s+(a|an|the)?\s*(email|response|letter|message)/i,
    /\b(write|draft)\s+(response|reply)/i,
    /\bresponse\s+email\b/i,
    /\bemail\s+on\s+behalf\b/i,
    /\bwrite.*on behalf/i,
    /\breply\s+to\s+email/i,
    /\brespond\s+to.*email/i
  ];

  for (const indicator of emailDraftingIndicators) {
    if (indicator.test(text)) {
      console.log('🚫 [ReportIntent] Email drafting request detected, skipping report detection');
      return null;
    }
  }

  if (!hasReportActionWords(text)) {
    return null;
  }

  const subjectDetection = detectSubject(text);
  const scope = detectScope(text);
  const period = detectPeriod(text);
  const format = detectFormat(text);
  const buildingContext = extractBuildingContext(text);

  const confidence = calculateConfidence(text, subjectDetection.subject, scope);

  if (confidence < 0.3) {
    return null;
  }

  return {
    kind: 'GET_REPORT',
    subject: subjectDetection.subject,
    scope,
    buildingId: currentBuildingId,
    unitId: currentUnitId,
    period,
    format,
    rawText: text,
    confidence
  };
}

/**
 * Get all supported report subjects
 */
export function getSupportedSubjects(): string[] {
  return Object.keys(REPORT_SUBJECTS);
}

/**
 * Get all supported scopes
 */
export function getSupportedScopes(): string[] {
  return Object.keys(SCOPE_INDICATORS);
}

/**
 * Get all supported formats
 */
export function getSupportedFormats(): string[] {
  return Object.keys(FORMAT_INDICATORS);
}
