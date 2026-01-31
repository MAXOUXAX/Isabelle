export const HOUR_IN_MS = 60 * 60 * 1000;
export const DAY_IN_MS = 24 * HOUR_IN_MS;

const dateFormatter = new Intl.DateTimeFormat('fr', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
});

const shortDateFormatter = new Intl.DateTimeFormat('fr', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function startOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return startOfDay(new Date(now.setDate(diff)));
}

export function endOfCurrentWeek() {
  if (new Date().getDay() === 5) {
    return endOfDay(new Date());
  }

  const start = startOfCurrentWeek();
  const end = new Date(start.setDate(start.getDate() + 4));
  return endOfDay(end);
}

export function startOfToday() {
  return startOfDay(new Date());
}

export function endOfToday() {
  return endOfDay(new Date());
}

export function startOfDay(date: Date) {
  const clonedDate = new Date(date.getTime());
  clonedDate.setHours(8, 0, 0, 0);
  return clonedDate;
}

export function endOfDay(date: Date) {
  const clonedDate = new Date(date.getTime());
  clonedDate.setHours(20, 0, 0, 0);
  return clonedDate;
}

export function humanDate(date: Date) {
  return dateFormatter.format(date);
}

export function humanShortDate(date: Date) {
  return shortDateFormatter.format(date);
}

export function humanTime(date: Date) {
  return date.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculates the next available usage time based on the most recent usage and daily limits.
 *
 * @param lastUse - The date and time of the last use.
 * @param usageCount24h - Number of usages within the past 24 hours.
 * @param maxUsagesPerDay - Maximum allowed usages within a 24-hour period.
 * @returns The date and time when the resource can be used again.
 */
export function timeUntilNextUse(
  lastUse: Date,
  usageCount24h: number,
  maxUsagesPerDay: number,
): Date {
  const timeToAdd = usageCount24h >= maxUsagesPerDay ? DAY_IN_MS : HOUR_IN_MS;
  return new Date(lastUse.getTime() + timeToAdd);
}

/**
 * Parses a date string in the format "DD/MM/YYYY HH:MM".
 * Returns null if the format is invalid or the date is invalid.
 *
 * @param dateString - The date string to parse (e.g., "26/03/2025 14:00")
 * @returns A Date object or null
 */
export function parseCustomDate(dateString: string): Date | null {
  const regex = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/;
  const match = regex.exec(dateString);

  if (!match) {
    return null;
  }

  const [, dayStr, monthStr, yearStr, hourStr, minuteStr] = match;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  // Month is 0-indexed in JS Date
  const date = new Date(year, month - 1, day, hour, minute);

  // Check if the date components match the input (handles "31/02/2025" -> March 3rd case)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }

  return date;
}
