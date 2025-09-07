/**
 * Period Parsing for Ask BlocIQ Reports
 * Parses natural language period expressions into ISO date ranges
 */

export interface PeriodRange {
  since: string; // ISO date string
  until?: string; // ISO date string (optional)
  label: string; // Human-readable label
}

/**
 * Parse natural language period expressions
 */
export function parsePeriod(periodText: string): PeriodRange {
  const lowerText = periodText.toLowerCase().trim();
  
  // Today
  if (lowerText === 'today' || lowerText === 'this day') {
    const today = new Date();
    return {
      since: today.toISOString().split('T')[0],
      label: 'Today'
    };
  }
  
  // Yesterday
  if (lowerText === 'yesterday' || lowerText === 'yesterday\'s') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      since: yesterday.toISOString().split('T')[0],
      until: yesterday.toISOString().split('T')[0],
      label: 'Yesterday'
    };
  }
  
  // This week
  if (lowerText === 'this week' || lowerText === 'current week' || lowerText === 'week to date') {
    const startOfWeek = getStartOfWeek(new Date());
    return {
      since: startOfWeek.toISOString().split('T')[0],
      label: 'This week'
    };
  }
  
  // Last week
  if (lowerText === 'last week' || lowerText === 'previous week') {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const startOfLastWeek = getStartOfWeek(lastWeek);
    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(endOfLastWeek.getDate() + 6);
    return {
      since: startOfLastWeek.toISOString().split('T')[0],
      until: endOfLastWeek.toISOString().split('T')[0],
      label: 'Last week'
    };
  }
  
  // This month
  if (lowerText === 'this month' || lowerText === 'current month' || lowerText === 'month to date') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    return {
      since: startOfMonth.toISOString().split('T')[0],
      label: 'This month'
    };
  }
  
  // Last month
  if (lowerText === 'last month' || lowerText === 'previous month') {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    return {
      since: startOfLastMonth.toISOString().split('T')[0],
      until: endOfLastMonth.toISOString().split('T')[0],
      label: 'Last month'
    };
  }
  
  // This quarter
  if (lowerText === 'this quarter' || lowerText === 'current quarter' || lowerText === 'quarter to date') {
    const startOfQuarter = getStartOfQuarter(new Date());
    return {
      since: startOfQuarter.toISOString().split('T')[0],
      label: 'This quarter'
    };
  }
  
  // Last quarter
  if (lowerText === 'last quarter' || lowerText === 'previous quarter') {
    const lastQuarter = new Date();
    lastQuarter.setMonth(lastQuarter.getMonth() - 3);
    const startOfLastQuarter = getStartOfQuarter(lastQuarter);
    const endOfLastQuarter = new Date(startOfLastQuarter);
    endOfLastQuarter.setMonth(endOfLastQuarter.getMonth() + 3);
    endOfLastQuarter.setDate(0); // Last day of the quarter
    return {
      since: startOfLastQuarter.toISOString().split('T')[0],
      until: endOfLastQuarter.toISOString().split('T')[0],
      label: 'Last quarter'
    };
  }
  
  // Year to date
  if (lowerText === 'ytd' || lowerText === 'year to date' || lowerText === 'this year' || lowerText === 'current year') {
    const startOfYear = new Date();
    startOfYear.setMonth(0, 1);
    return {
      since: startOfYear.toISOString().split('T')[0],
      label: 'Year to date'
    };
  }
  
  // Last year
  if (lowerText === 'last year' || lowerText === 'previous year') {
    const lastYear = new Date();
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    const startOfLastYear = new Date(lastYear.getFullYear(), 0, 1);
    const endOfLastYear = new Date(lastYear.getFullYear(), 11, 31);
    return {
      since: startOfLastYear.toISOString().split('T')[0],
      until: endOfLastYear.toISOString().split('T')[0],
      label: 'Last year'
    };
  }
  
  // Custom date range
  const dateRangePattern = /(?:from|since)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:to|until)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i;
  const dateRangeMatch = periodText.match(dateRangePattern);
  if (dateRangeMatch) {
    const [, since, until] = dateRangeMatch;
    return {
      since: parseCustomDate(since),
      until: parseCustomDate(until),
      label: `${formatDateForDisplay(since)} to ${formatDateForDisplay(until)}`
    };
  }
  
  // Single date
  const singleDatePattern = /(?:from|since)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i;
  const singleDateMatch = periodText.match(singleDatePattern);
  if (singleDateMatch) {
    const since = singleDateMatch[1];
    return {
      since: parseCustomDate(since),
      label: `From ${formatDateForDisplay(since)}`
    };
  }
  
  // Default to this quarter if no match
  const startOfQuarter = getStartOfQuarter(new Date());
  return {
    since: startOfQuarter.toISOString().split('T')[0],
    label: 'This quarter (default)'
  };
}

/**
 * Get start of week (Monday)
 */
function getStartOfWeek(date: Date): Date {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek;
}

/**
 * Get start of quarter
 */
function getStartOfQuarter(date: Date): Date {
  const quarter = Math.floor(date.getMonth() / 3);
  const startOfQuarter = new Date(date.getFullYear(), quarter * 3, 1);
  startOfQuarter.setHours(0, 0, 0, 0);
  return startOfQuarter;
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
 * Format date for display
 */
function formatDateForDisplay(dateStr: string): string {
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

/**
 * Get all supported period expressions
 */
export function getSupportedPeriods(): string[] {
  return [
    'today',
    'yesterday',
    'this week',
    'last week',
    'this month',
    'last month',
    'this quarter',
    'last quarter',
    'ytd',
    'last year',
    'from DD/MM/YYYY to DD/MM/YYYY',
    'since DD/MM/YYYY'
  ];
}

/**
 * Validate period text
 */
export function validatePeriod(periodText: string): { valid: boolean; error?: string } {
  if (!periodText || periodText.trim().length === 0) {
    return { valid: false, error: 'Period text is required' };
  }
  
  try {
    const period = parsePeriod(periodText);
    if (!period.since) {
      return { valid: false, error: 'Could not parse period' };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid period format' };
  }
}

/**
 * Format period for display
 */
export function formatPeriodDisplay(period: PeriodRange): string {
  if (period.until) {
    return `${period.label} (${period.since} to ${period.until})`;
  }
  return `${period.label} (from ${period.since})`;
}

/**
 * Get period suggestions based on context
 */
export function getPeriodSuggestions(context: 'compliance' | 'documents' | 'general'): string[] {
  const baseSuggestions = [
    'this quarter',
    'this month',
    'last month',
    'ytd'
  ];
  
  switch (context) {
    case 'compliance':
      return [
        ...baseSuggestions,
        'this week',
        'last week',
        'last quarter'
      ];
    case 'documents':
      return [
        ...baseSuggestions,
        'this week',
        'last week'
      ];
    default:
      return baseSuggestions;
  }
}
