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
 * Checks if a given day, month, and year form a valid date.
 *
 * @param day - Day of the month (1-31).
 * @param month - Month of the year (1-12).
 * @param year - Year (e.g., 2024).
 * @returns True if the date is valid, false otherwise.
 */
export function isValidDate(day: number, month: number, year: number): boolean {
  const date = new Date(year, month - 1, day);
  return (
    day >= 1 &&
    day <= 31 &&
    month >= 1 &&
    month <= 12 &&
    year >= 1970 &&
    date.getDate() === day &&
    date.getMonth() === month - 1 &&
    date.getFullYear() === year
  );
}
