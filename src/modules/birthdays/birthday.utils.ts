import { time, TimestampStyles } from 'discord.js';

/** Maximum day for each 1-indexed month. February allows 29 to accept leap-year birthdays. */
const MAX_DAY_PER_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function isValidMonthDay(month: number, day: number): boolean {
  if (month < 1 || month > 12) {
    return false;
  }

  return day >= 1 && day <= MAX_DAY_PER_MONTH[month - 1];
}

export function formatDayMonth(day: number, month: number): string {
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
}

const longDayMonthFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
});

/** Formats a day/month as full French text, e.g. "26 mars". */
export function formatLongDayMonth(day: number, month: number): string {
  // 2000 is a leap year, so 29/02 formats correctly.
  return longDayMonthFormatter.format(new Date(2000, month - 1, day));
}

/**
 * Returns the next calendar date (local midnight) on which the given day/month
 * occurs, relative to `from`. When the birthday is today, returns today.
 *
 * A 29 February birthday is observed on 28 February in non-leap years so the
 * countdown never silently rolls over into March.
 */
export function nextBirthdayDate(month: number, day: number, from: Date): Date {
  const reference = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
  );

  let next = buildBirthdayDate(from.getFullYear(), month, day);
  if (next < reference) {
    next = buildBirthdayDate(from.getFullYear() + 1, month, day);
  }

  return next;
}

/** Whether `year` is a leap year in the proleptic Gregorian calendar. */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Builds a local-midnight date for a birthday in a given year, clamping
 * 29 February to 28 February in non-leap years to avoid rolling into March.
 */
function buildBirthdayDate(year: number, month: number, day: number): Date {
  const safeDay = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day;
  return new Date(year, month - 1, safeDay);
}

/**
 * Number of days from `from` until the next occurrence of the given day/month,
 * wrapping around the end of the year. Returns 0 when the birthday is today.
 */
export function daysUntilBirthday(
  month: number,
  day: number,
  from: Date,
): number {
  const reference = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
  );

  const next = nextBirthdayDate(month, day, from);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((next.getTime() - reference.getTime()) / MS_PER_DAY);
}

/**
 * Human-friendly countdown to the next occurrence of the given day/month.
 * Returns "aujourd'hui 🎉" when the birthday is today, otherwise a Discord
 * relative timestamp (e.g. "dans 5 jours") pointing at the next occurrence.
 */
export function formatBirthdayCountdown(
  month: number,
  day: number,
  from: Date,
): string {
  if (daysUntilBirthday(month, day, from) === 0) {
    return "aujourd'hui 🎉";
  }

  return time(nextBirthdayDate(month, day, from), TimestampStyles.RelativeTime);
}

/** Whether `date` falls on the same calendar day (local time) as `reference`. */
export function isSameLocalDay(date: Date | null, reference: Date): boolean {
  if (!date) {
    return false;
  }

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}
