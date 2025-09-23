// lib/addin/format.ts
// Formatting utilities for the Outlook add-in

/**
 * Returns the value or a fallback string if the value is null/undefined
 */
export function fallback(value: string | null | undefined): string {
  return value ?? "(no data available)";
}

/**
 * Formats an ISO date string to UK date format (DD/MM/YYYY)
 */
export function ukDate(isoString: string | null | undefined): string {
  if (!isoString) return "(no data available)";

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "(invalid date)";

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return "(invalid date)";
  }
}

/**
 * Formats a date to UK format with time (DD/MM/YYYY HH:MM)
 */
export function ukDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "(no data available)";

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "(invalid date)";

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return "(invalid date)";
  }
}

/**
 * Formats a building name with fallback
 */
export function formatBuildingName(name: string | null | undefined): string {
  return name ? name : "(building name not available)";
}

/**
 * Formats a unit label with fallback
 */
export function formatUnitLabel(label: string | null | undefined): string {
  return label ? label : "(unit not available)";
}

/**
 * Formats a resident name with fallback
 */
export function formatResidentName(name: string | null | undefined): string {
  return name ? name : "Resident";
}