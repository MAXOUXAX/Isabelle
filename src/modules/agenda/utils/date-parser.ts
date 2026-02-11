const FRENCH_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d+):(\d{2})$/;
export const ONE_MINUTE_MS = 60 * 1000;

/**
 * Parse a French date string (DD/MM/YYYY HH:mm) and (DD/MM/YYYY H:mm) to a Date object.
 * Returns null if the date is invalid.
 */
export function parseFrenchDate(dateString: string): Date | null {
  const match = FRENCH_DATE_REGEX.exec(dateString.trim());
  if (!match) return null;

  const [, day, month, year, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );

  // Validate the date is actually valid (e.g., not 31/02/2025)
  if (
    date.getDate() !== Number(day) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getFullYear() !== Number(year)
  ) {
    return null;
  }

  return date;
}

export interface ParsedDateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Parse a combined date range string.
 * Formats:
 * - "DD/MM/YYYY HH:mm" (deadline, end = start + 1 minute)
 * - "DD/MM/YYYY HH:mm - DD/MM/YYYY HH:mm" (range)
 */
export function parseDateRange(datesString: string): ParsedDateRange | null {
  const parts = datesString.split('-').map((p) => p.trim());

  if (parts.length === 1) {
    // Single date = deadline mode
    const startDate = parseFrenchDate(parts[0]);
    if (!startDate) return null;
    const endDate = new Date(startDate.getTime() + ONE_MINUTE_MS);
    return { startDate, endDate };
  }

  if (parts.length === 2) {
    const startDate = parseFrenchDate(parts[0]);
    const endDate = parseFrenchDate(parts[1]);
    if (!startDate || !endDate) return null;

    // If dates are equal, shift end by 1 minute
    if (startDate.getTime() === endDate.getTime()) {
      return {
        startDate,
        endDate: new Date(endDate.getTime() + ONE_MINUTE_MS),
      };
    }

    return { startDate, endDate };
  }

  // Could be a date with dashes in the date itself, try parsing more carefully
  // Format: DD/MM/YYYY HH:mm - DD/MM/YYYY HH:mm has exactly 2 parts when split by " - "
  const rangeParts = datesString.split(' - ').map((p) => p.trim());
  if (rangeParts.length === 2) {
    const startDate = parseFrenchDate(rangeParts[0]);
    const endDate = parseFrenchDate(rangeParts[1]);
    if (!startDate || !endDate) return null;

    if (startDate.getTime() === endDate.getTime()) {
      return {
        startDate,
        endDate: new Date(endDate.getTime() + ONE_MINUTE_MS),
      };
    }

    return { startDate, endDate };
  }

  return null;
}

/**
 * Format a date in French locale.
 */
export function formatFrenchDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateInput(date: Date): string {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = String(date.getFullYear());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());

  return `${day}/${month}/${year} ${hour}:${minute}`;
}

/**
 * Check if two dates are approximately 1 minute apart (deadline mode).
 */
export function isDeadlineMode(startDate: Date, endDate: Date): boolean {
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs <= ONE_MINUTE_MS;
}

export function formatDateRangeInput(startDate: Date, endDate: Date): string {
  if (isDeadlineMode(startDate, endDate)) {
    return formatDateInput(startDate);
  }

  return `${formatDateInput(startDate)} - ${formatDateInput(endDate)}`;
}
