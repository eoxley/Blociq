// lib/addin/promises.ts
// Promise detection and follow-up scheduling utilities

export interface PromiseMatch {
  matchedText: string;
  dueAtISO: string;
  humanLabel: string;
  type: 'working_days' | 'days' | 'hours' | 'specific_day' | 'specific_date';
  value?: number;
  dayName?: string;
  date?: string;
}

/**
 * Detects promises/commitments in draft text and extracts timeframes
 */
export function detectPromises(draft: string): PromiseMatch | null {
  const patterns = [
    // Working days patterns
    {
      regex: /within\s+(\d+)\s+working\s+days?/gi,
      type: 'working_days' as const,
      extract: (match: RegExpMatchArray) => ({
        value: parseInt(match[1]),
        matchedText: match[0]
      })
    },
    // Calendar days patterns
    {
      regex: /within\s+(\d+)\s+days?/gi,
      type: 'days' as const,
      extract: (match: RegExpMatchArray) => ({
        value: parseInt(match[1]),
        matchedText: match[0]
      })
    },
    // Hours patterns
    {
      regex: /within\s+(\d+)\s+hours?/gi,
      type: 'hours' as const,
      extract: (match: RegExpMatchArray) => ({
        value: parseInt(match[1]),
        matchedText: match[0]
      })
    },
    // Tomorrow pattern
    {
      regex: /\btomorrow\b/gi,
      type: 'days' as const,
      extract: (match: RegExpMatchArray) => ({
        value: 1,
        matchedText: match[0]
      })
    },
    // Specific weekday patterns
    {
      regex: /\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      type: 'specific_day' as const,
      extract: (match: RegExpMatchArray) => ({
        dayName: match[1].toLowerCase(),
        matchedText: match[0]
      })
    },
    // Specific date patterns (DD/MM/YYYY or DD/MM/YY)
    {
      regex: /\bby\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\b/gi,
      type: 'specific_date' as const,
      extract: (match: RegExpMatchArray) => ({
        date: match[1],
        matchedText: match[0]
      })
    }
  ];

  for (const pattern of patterns) {
    const matches = Array.from(draft.matchAll(pattern.regex));
    if (matches.length > 0) {
      const match = matches[0]; // Take first match
      const extracted = pattern.extract(match);

      try {
        const dueAt = computeDueAtUK(new Date(), {
          type: pattern.type,
          ...extracted
        });

        return {
          ...extracted,
          type: pattern.type,
          dueAtISO: dueAt.toISOString(),
          humanLabel: humanizeDueAt(dueAt)
        };
      } catch (error) {
        console.warn('Failed to compute due date:', error);
        continue;
      }
    }
  }

  return null;
}

/**
 * Computes the due date in UK timezone, skipping weekends for working days
 */
export function computeDueAtUK(
  now: Date,
  spec: {
    type: 'working_days' | 'days' | 'hours' | 'specific_day' | 'specific_date';
    value?: number;
    dayName?: string;
    date?: string;
  }
): Date {
  // Convert to UK timezone for calculations
  const ukNow = new Date(now.toLocaleString("en-US", {timeZone: "Europe/London"}));

  switch (spec.type) {
    case 'hours':
      if (!spec.value) throw new Error('Hours value required');
      const hoursResult = new Date(ukNow);
      hoursResult.setHours(hoursResult.getHours() + spec.value);
      return hoursResult;

    case 'days':
      if (!spec.value) throw new Error('Days value required');
      const daysResult = new Date(ukNow);
      daysResult.setDate(daysResult.getDate() + spec.value);
      daysResult.setHours(16, 0, 0, 0); // 4 PM default
      return daysResult;

    case 'working_days':
      if (!spec.value) throw new Error('Working days value required');
      let workingDaysResult = new Date(ukNow);
      let daysToAdd = spec.value;

      while (daysToAdd > 0) {
        workingDaysResult.setDate(workingDaysResult.getDate() + 1);
        const dayOfWeek = workingDaysResult.getDay();
        // Skip weekends (0 = Sunday, 6 = Saturday)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          daysToAdd--;
        }
      }

      workingDaysResult.setHours(16, 0, 0, 0); // 4 PM default
      return workingDaysResult;

    case 'specific_day':
      if (!spec.dayName) throw new Error('Day name required');
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = dayNames.indexOf(spec.dayName.toLowerCase());
      if (targetDay === -1) throw new Error('Invalid day name');

      const specificDayResult = new Date(ukNow);
      const currentDay = specificDayResult.getDay();
      let daysUntilTarget = (targetDay - currentDay + 7) % 7;
      if (daysUntilTarget === 0) daysUntilTarget = 7; // Next week if same day

      specificDayResult.setDate(specificDayResult.getDate() + daysUntilTarget);
      specificDayResult.setHours(16, 0, 0, 0); // 4 PM default
      return specificDayResult;

    case 'specific_date':
      if (!spec.date) throw new Error('Date required');
      const dateParts = spec.date.split('/');
      if (dateParts.length !== 3) throw new Error('Invalid date format');

      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
      let year = parseInt(dateParts[2]);

      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }

      const specificDateResult = new Date(year, month, day, 16, 0, 0, 0);

      // Validate the date
      if (isNaN(specificDateResult.getTime())) {
        throw new Error('Invalid date');
      }

      return specificDateResult;

    default:
      throw new Error('Unknown date type');
  }
}

/**
 * Formats a due date for human display
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
 * Creates an Outlook calendar event for a follow-up
 */
export interface OutlookEventData {
  title: string;
  start: string; // ISO string
  end: string; // ISO string
  body: string;
  reminderMinutes: number;
}

export function createOutlookEventData(
  buildingName: string,
  subject: string,
  dueAtISO: string,
  blociqUrl: string = 'https://www.blociq.co.uk'
): OutlookEventData {
  const startDate = new Date(dueAtISO);
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 1); // 1 hour duration

  return {
    title: `Follow-up: ${buildingName}`,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    body: `Follow-up required for: ${subject}\n\nBuilding: ${buildingName}\n\nManage in BlocIQ: ${blociqUrl}`,
    reminderMinutes: 120 // 2 hours before
  };
}