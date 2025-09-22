/**
 * Promise detection utility for email drafts
 * Detects time-based commitments and computes due dates using UK working day logic
 */

export interface PromiseMatch {
  matchedText: string;
  dueAtISO: string;
  humanLabel: string;
  originalMatch: string;
  type: 'working_days' | 'days' | 'hours' | 'tomorrow' | 'day_of_week' | 'specific_date';
}

const PROMISE_PATTERNS = [
  // Working days patterns
  {
    pattern: /within\s+(\d+)\s+working\s+days?/gi,
    type: 'working_days' as const,
    extractValue: (match: RegExpMatchArray) => parseInt(match[1])
  },
  // Calendar days patterns
  {
    pattern: /within\s+(\d+)\s+days?/gi,
    type: 'days' as const,
    extractValue: (match: RegExpMatchArray) => parseInt(match[1])
  },
  // Hours patterns
  {
    pattern: /within\s+(\d+)\s+hours?/gi,
    type: 'hours' as const,
    extractValue: (match: RegExpMatchArray) => parseInt(match[1])
  },
  // Tomorrow pattern
  {
    pattern: /\btomorrow\b/gi,
    type: 'tomorrow' as const,
    extractValue: () => 1
  },
  // Day of week patterns
  {
    pattern: /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    type: 'day_of_week' as const,
    extractValue: (match: RegExpMatchArray) => match[1].toLowerCase()
  },
  // Specific date patterns (DD/MM/YYYY, DD/MM/YY, DD/MM)
  {
    pattern: /\bby\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\b/gi,
    type: 'specific_date' as const,
    extractValue: (match: RegExpMatchArray) => match[1]
  },
  // Additional common patterns
  {
    pattern: /\bby\s+the\s+end\s+of\s+the\s+week\b/gi,
    type: 'day_of_week' as const,
    extractValue: () => 'friday'
  },
  {
    pattern: /\bby\s+close\s+of\s+business\b/gi,
    type: 'hours' as const,
    extractValue: () => 8 // End of business day
  }
];

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Detect promises in email draft text
 */
export function detectPromises(draftText: string): PromiseMatch[] {
  const promises: PromiseMatch[] = [];
  const now = new Date();

  for (const { pattern, type, extractValue } of PROMISE_PATTERNS) {
    let match;
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;

    while ((match = pattern.exec(draftText)) !== null) {
      try {
        const value = extractValue(match);
        const dueAt = computeDueAtUK(now, type, value);

        if (dueAt) {
          promises.push({
            matchedText: match[0],
            dueAtISO: dueAt.toISOString(),
            humanLabel: humanizeDueAt(dueAt),
            originalMatch: match[0],
            type
          });
        }
      } catch (error) {
        console.warn('Error processing promise match:', match[0], error);
      }
    }
  }

  // Remove duplicates based on similar due dates (within 1 hour)
  return deduplicatePromises(promises);
}

/**
 * Compute due date using UK working day logic
 */
export function computeDueAtUK(
  now: Date,
  type: string,
  value: string | number
): Date | null {
  const baseDate = new Date(now);

  switch (type) {
    case 'working_days': {
      const days = value as number;
      return addWorkingDays(baseDate, days);
    }

    case 'days': {
      const days = value as number;
      const result = new Date(baseDate);
      result.setDate(result.getDate() + days);
      result.setHours(16, 0, 0, 0); // Default to 4 PM
      return result;
    }

    case 'hours': {
      const hours = value as number;
      const result = new Date(baseDate);
      result.setTime(result.getTime() + (hours * 60 * 60 * 1000));
      return result;
    }

    case 'tomorrow': {
      const result = new Date(baseDate);
      result.setDate(result.getDate() + 1);
      result.setHours(16, 0, 0, 0); // Default to 4 PM
      return result;
    }

    case 'day_of_week': {
      const dayName = value as string;
      return getNextDayOfWeek(baseDate, dayName);
    }

    case 'specific_date': {
      const dateStr = value as string;
      return parseUKDate(dateStr, baseDate.getFullYear());
    }

    default:
      return null;
  }
}

/**
 * Add working days (skipping weekends)
 */
function addWorkingDays(date: Date, workingDays: number): Date {
  const result = new Date(date);
  let daysAdded = 0;

  while (daysAdded < workingDays) {
    result.setDate(result.getDate() + 1);

    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      daysAdded++;
    }
  }

  // Set to 4 PM on the target working day
  result.setHours(16, 0, 0, 0);

  return result;
}

/**
 * Get next occurrence of a specific day of the week
 */
function getNextDayOfWeek(date: Date, dayName: string): Date {
  const targetDay = DAY_NAMES.indexOf(dayName.toLowerCase());
  if (targetDay === -1) return null;

  const result = new Date(date);
  const currentDay = result.getDay();

  let daysToAdd = targetDay - currentDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Next week
  }

  result.setDate(result.getDate() + daysToAdd);
  result.setHours(16, 0, 0, 0); // Default to 4 PM

  return result;
}

/**
 * Parse UK date format (DD/MM/YYYY, DD/MM/YY, DD/MM)
 */
function parseUKDate(dateStr: string, currentYear: number): Date | null {
  const parts = dateStr.split('/');
  if (parts.length < 2 || parts.length > 3) return null;

  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // Month is 0-indexed
  let year = currentYear;

  if (parts.length === 3) {
    year = parseInt(parts[2]);
    // Handle 2-digit years
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
  }

  if (day < 1 || day > 31 || month < 0 || month > 11) return null;

  const result = new Date(year, month, day, 16, 0, 0, 0); // Default to 4 PM

  // If date is in the past, assume next year
  if (result < new Date()) {
    result.setFullYear(result.getFullYear() + 1);
  }

  return result;
}

/**
 * Convert date to human-readable UK format
 */
export function humanizeDueAt(date: Date): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[date.getDay()];

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${dayName} ${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Remove duplicate promises that are very close in time
 */
function deduplicatePromises(promises: PromiseMatch[]): PromiseMatch[] {
  if (promises.length <= 1) return promises;

  const sorted = promises.sort((a, b) =>
    new Date(a.dueAtISO).getTime() - new Date(b.dueAtISO).getTime()
  );

  const deduplicated: PromiseMatch[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i].dueAtISO);
    const last = new Date(deduplicated[deduplicated.length - 1].dueAtISO);

    // If more than 1 hour apart, keep it
    if (Math.abs(current.getTime() - last.getTime()) > 60 * 60 * 1000) {
      deduplicated.push(sorted[i]);
    }
  }

  return deduplicated;
}

/**
 * Check if a date is a UK working day (Monday-Friday, excluding bank holidays)
 */
export function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  if (day === 0 || day === 6) return false;

  // TODO: Could add bank holiday checking here
  // For now, just check weekdays
  return true;
}

/**
 * Get the next working day from a given date
 */
export function getNextWorkingDay(date: Date): Date {
  const result = new Date(date);

  do {
    result.setDate(result.getDate() + 1);
  } while (!isWorkingDay(result));

  return result;
}