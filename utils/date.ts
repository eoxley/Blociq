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
