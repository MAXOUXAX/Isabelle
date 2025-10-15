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

export function fromDrizzleDate(
  value: Date | number | string | bigint | null | undefined,
): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    if (Number.isNaN(asNumber)) {
      return new Date(0);
    }
    return new Date(asNumber);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();

    const isoCandidate =
      trimmed.includes('T') || !trimmed.includes(' ')
        ? trimmed
        : trimmed.replace(' ', 'T');

    const parsedIso = Date.parse(isoCandidate);
    if (!Number.isNaN(parsedIso)) {
      return new Date(parsedIso);
    }

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      return new Date(numeric);
    }

    if (!trimmed.endsWith('Z')) {
      const parsedUtc = Date.parse(`${trimmed.replace(' ', 'T')}Z`);
      if (!Number.isNaN(parsedUtc)) {
        return new Date(parsedUtc);
      }
    }

    return new Date(0);
  }
  return new Date(0);
}

export function timeUntilNextUse(
  value: Date | number | string | bigint | null | undefined,
): Date {
  const baseDate = fromDrizzleDate(value);
  return new Date(baseDate.getTime() + HOUR_IN_MS);
}
