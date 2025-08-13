import { DateTime } from 'luxon'
import { findIana } from 'windows-iana'

export const DEFAULT_TZ = 'Europe/London'

/**
 * Convert a Windows time zone (e.g., "GMT Standard Time") to an IANA zone.
 * If already an IANA name (has '/'), return as-is.
 */
export function toIanaZone(tz?: string | null): string | null {
  if (!tz) return null
  if (tz.includes('/')) return tz // looks like IANA already
  try {
    const mapped = findIana(tz)
    if (mapped && mapped.length > 0) return mapped[0].value
  } catch {}
  return null
}

/**
 * Graph → UTC
 * Input can be Graph's shape:
 *   { dateTime: '2025-08-13T10:00:00', timeZone: 'GMT Standard Time' }
 * or already-ISO string.
 */
export function graphToUTCISO(
  start: { dateTime?: string; timeZone?: string } | string,
  fallbackIana = DEFAULT_TZ
): string | null {
  if (!start) return null

  if (typeof start === 'string') {
    // If it already has a 'Z' or offset, trust it.
    if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(start)) {
      return DateTime.fromISO(start, { setZone: true }).toUTC().toISO()
    }
    // Naive ISO -> assume it's in fallback zone, convert to UTC
    return DateTime.fromISO(start, { zone: fallbackIana }).toUTC().toISO()
  }

  const { dateTime, timeZone } = start
  if (!dateTime) return null
  
  // Handle Windows timezone names properly
  let iana = fallbackIana
  if (timeZone) {
    iana = toIanaZone(timeZone) || fallbackIana
  }
  
  const dt = DateTime.fromISO(dateTime, { zone: iana })
  if (!dt.isValid) {
    console.warn('Invalid date:', dateTime, 'with zone:', iana)
    return null
  }
  
  return dt.toUTC().toISO()
}

/** Format a UTC ISO string into a local zone. */
export function formatInZone(utcISO: string, zone = DEFAULT_TZ, fmt = 'HH:mm') {
  try {
    const dt = DateTime.fromISO(utcISO, { zone: 'utc' })
    if (!dt.isValid) {
      console.warn('Invalid UTC ISO:', utcISO)
      return 'Invalid time'
    }
    return dt.setZone(zone).toFormat(fmt)
  } catch (error) {
    console.error('Error formatting time:', error)
    return 'Error'
  }
}

/** Detect browser zone safely on client; fallback to DEFAULT_TZ. */
export function getClientZone(): string {
  if (typeof window === 'undefined') return DEFAULT_TZ
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return browserZone || DEFAULT_TZ
}

/**
 * Check if an event is all-day based on Graph/Outlook data
 */
export function isAllDayEvent(start: any, end?: any): boolean {
  // Graph/Outlook all-day events often have specific patterns
  if (start?.dateTime === undefined && start?.date !== undefined) return true
  if (end?.dateTime === undefined && end?.date !== undefined) return true
  
  // Check if start/end times are midnight (all-day indicator)
  if (start?.dateTime && end?.dateTime) {
    const startTime = DateTime.fromISO(start.dateTime)
    const endTime = DateTime.fromISO(end.dateTime)
    return startTime.hour === 0 && startTime.minute === 0 && 
           endTime.hour === 0 && endTime.minute === 0
  }
  
  return false
}

/**
 * Convert Graph/Outlook event times to standardized format
 */
export function normalizeEventTimes(event: any) {
  const start = event.start || event.startTime
  const end = event.end || event.endTime
  const isAllDay = isAllDayEvent(start, end)
  
  if (isAllDay) {
    return {
      startUtc: start?.date || start?.dateTime,
      endUtc: end?.date || end?.dateTime,
      timeZoneIana: null,
      isAllDay: true
    }
  }
  
  // Ensure we have proper timezone handling
  let startUtc = graphToUTCISO(start)
  let endUtc = graphToUTCISO(end)
  
  // If conversion failed, try to parse as local time and convert
  if (!startUtc && start?.dateTime) {
    try {
      const dt = DateTime.fromISO(start.dateTime, { zone: DEFAULT_TZ })
      if (dt.isValid) {
        startUtc = dt.toUTC().toISO()
      }
    } catch {}
  }
  
  if (!endUtc && end?.dateTime) {
    try {
      const dt = DateTime.fromISO(end.dateTime, { zone: DEFAULT_TZ })
      if (dt.isValid) {
        endUtc = dt.toUTC().toISO()
      }
    } catch {}
  }
  
  const timeZoneIana = toIanaZone(start?.timeZone) || DEFAULT_TZ
  
  return {
    startUtc,
    endUtc,
    timeZoneIana,
    isAllDay: false
  }
}
