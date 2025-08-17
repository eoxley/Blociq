export const UK_TZ = 'Europe/London';

function normalizeISO(isoLike: string) {
  // If it's date-only (all-day), keep as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoLike)) return { iso: isoLike, allDay: true };
  // If no timezone information, assume UTC to avoid host-local drift
  const hasTZ = /Z$|[+-]\d\d:\d\d$/.test(isoLike);
  return { iso: hasTZ ? isoLike : `${isoLike}Z`, allDay: false };
}

export function formatEventTimeUK(isoLike: string, opts?: Intl.DateTimeFormatOptions) {
  const { iso, allDay } = normalizeISO(isoLike);
  if (allDay) return 'All day';
  const d = new Date(iso);
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: UK_TZ,
    ...opts,
  };
  return new Intl.DateTimeFormat('en-GB', options).format(d);
}

export function formatEventRangeUK(startISO: string, endISO: string) {
  const start = formatEventTimeUK(startISO);
  const end = formatEventTimeUK(endISO);
  if (start === 'All day' || end === 'All day') return 'All day';
  return `${start} – ${end}`;
}

/**
 * Format a date string to UK timezone with date and time
 * @param dateString - ISO date string (assumed to be UTC if no timezone specified)
 * @returns Formatted string like "Fri, 22 Aug 2025 at 09:00"
 */
export function formatToUKTime(dateString: string): string {
  const { iso, allDay } = normalizeISO(dateString);
  if (allDay) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: UK_TZ
    });
  }
  
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: UK_TZ
  }).replace(',', '').replace(/(\d{1,2}):(\d{2})/, ' at $1:$2');
}

/**
 * Format a date string to UK timezone for display in event lists
 * @param dateString - ISO date string (assumed to be UTC if no timezone specified)
 * @returns Object with date, time, and fullDate properties
 */
export function formatEventDateUK(dateString: string) {
  if (!dateString) {
    return {
      date: 'Unknown Date',
      time: 'Unknown Time',
      fullDate: 'Unknown Date'
    };
  }
  
  const { iso, allDay } = normalizeISO(dateString);
  const d = new Date(iso);
  
  if (isNaN(d.getTime())) {
    return {
      date: 'Invalid Date',
      time: 'Invalid Time',
      fullDate: 'Invalid Date'
    };
  }
  
  if (allDay) {
    return {
      date: d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: UK_TZ
      }),
      time: 'All day',
      fullDate: d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: UK_TZ
      })
    };
  }
  
  return {
    date: d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: UK_TZ
    }),
    time: d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: UK_TZ
    }),
    fullDate: d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: UK_TZ
    })
  };
}

/**
 * Format a date string to UK timezone for simple date display
 * @param dateString - ISO date string (assumed to be UTC if no timezone specified)
 * @returns Formatted date string
 */
export function formatDateUK(dateString: string): string {
  if (!dateString) return 'Unknown Date';
  
  const { iso } = normalizeISO(dateString);
  const d = new Date(iso);
  
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return d.toLocaleDateString('en-GB', {
    timeZone: UK_TZ
  });
}

/**
 * Format a date string to UK timezone for date and time display
 * @param dateString - ISO date string (assumed to be UTC if no timezone specified)
 * @returns Formatted date and time string
 */
export function formatDateTimeUK(dateString: string): string {
  if (!dateString) return 'Unknown Date';
  
  const { iso } = normalizeISO(dateString);
  const d = new Date(iso);
  
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return d.toLocaleString('en-GB', {
    timeZone: UK_TZ
  });
}

/**
 * Test function to verify timezone conversion is working correctly
 * This function demonstrates the conversion from UTC to UK time
 */
export function testTimezoneConversion() {
  // Test with a UTC time that should show as 10:00 in BST (summer)
  const utcTime = '2025-08-22T09:00:00Z'; // 09:00 UTC
  const ukTime = formatToUKTime(utcTime);
  
  console.log('Timezone Conversion Test:');
  console.log(`UTC Time: ${utcTime}`);
  console.log(`UK Time: ${ukTime}`);
  console.log(`Expected: Should show as 10:00 during BST (summer)`);
  
  return {
    utcTime,
    ukTime,
    expected: 'Should show as 10:00 during BST (summer)'
  };
}
