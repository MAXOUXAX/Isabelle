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

export function humanTime(date: Date) {
  return date.toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' });
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Computes the next allowed usage timestamp based on recent activity and a daily limit.
 *
 * Logic:
 * - If the number of usages recorded in the past 24 hours (`usageCount24h`) has met or exceeded
 *   the maximum allowed (`maxUsagesPerDay`), the next allowed time is 24 hours after the oldest
 *   relevant usage (approximated here using the provided `lastUse` plus one day).
 * - Otherwise, a shorter cooldown applies: the next allowed time is one hour after `lastUse`.
 *
 * Assumptions:
 * - `lastUse` represents the most recent usage timestamp (or the oldest within the current rolling window
 *   if you are enforcing a rolling daily limit externally).
 * - Constants `DAY_IN_MS` and `HOUR_IN_MS` are millisecond durations (e.g., 24 * 60 * 60 * 1000, 60 * 60 * 1000).
 *
 * @param lastUse The Date of the most recent (or relevant) usage event.
 * @param usageCount24h The number of usages performed within the last 24-hour window.
 * @param maxUsagesPerDay The maximum number of allowed usages in any 24-hour period.
 * @returns A Date representing when the next usage is permitted.
 */
export function timeUntilNextUse(
  lastUse: Date,
  usageCount24h: number,
  maxUsagesPerDay: number,
): Date {
  // If user has reached daily limit, add 24 hours from the oldest usage
  // Otherwise, add 1 hour from the most recent usage
  const timeToAdd = usageCount24h >= maxUsagesPerDay ? DAY_IN_MS : HOUR_IN_MS;
  return new Date(lastUse.getTime() + timeToAdd);
}
