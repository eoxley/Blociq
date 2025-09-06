/**
 * Time window utilities for inbox dashboard
 */

export type TimeRange = 'day' | 'week' | 'month' | 'all'

export interface TimeWindow {
  since: Date
  until: Date | null
}

/**
 * Get time window based on range
 */
export function getTimeWindow(timeRange: TimeRange): TimeWindow {
  const now = new Date()
  
  switch (timeRange) {
    case 'day':
      return {
        since: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
        until: null
      }
    
    case 'week':
      return {
        since: getStartOfWeek(now),
        until: null
      }
    
    case 'month':
      return {
        since: getStartOfMonth(now),
        until: null
      }
    
    case 'all':
      return {
        since: new Date(0), // Beginning of time
        until: null
      }
    
    default:
      // Default to week
      return {
        since: getStartOfWeek(now),
        until: null
      }
  }
}

/**
 * Get start of week (Monday)
 */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get start of month
 */
function getStartOfMonth(date: Date): Date {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Validate time range
 */
export function isValidTimeRange(value: string): value is TimeRange {
  return ['day', 'week', 'month', 'all'].includes(value)
}
