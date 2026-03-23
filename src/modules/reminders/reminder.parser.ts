import { fr as chronoFr, type Component, type ParsedResult } from 'chrono-node';
import { fromZonedTime } from 'date-fns-tz';
import parseDurationValue from 'parse-duration';
import {
  MAX_DURATION_MS,
  MIN_DURATION_MS,
  PARIS_TIME_ZONE,
} from './reminder.constants.js';

const baseDurationUnits = { ...parseDurationValue.unit };
const reminderDurationUnits = {
  ...baseDurationUnits,
  an: baseDurationUnits.y,
  annee: baseDurationUnits.y,
  annees: baseDurationUnits.y,
  mois: baseDurationUnits.mo,
  sem: baseDurationUnits.w,
  semaine: baseDurationUnits.w,
  semaines: baseDurationUnits.w,
  j: baseDurationUnits.d,
  jour: baseDurationUnits.d,
  jours: baseDurationUnits.d,
  heure: baseDurationUnits.h,
  heures: baseDurationUnits.h,
  minute: baseDurationUnits.m,
  minutes: baseDurationUnits.m,
  seconde: baseDurationUnits.s,
  secondes: baseDurationUnits.s,
  secs: baseDurationUnits.s,
  mins: baseDurationUnits.m,
  hrs: baseDurationUnits.h,
  years: baseDurationUnits.y,
  months: baseDurationUnits.mo,
  weeks: baseDurationUnits.w,
  days: baseDurationUnits.d,
  hours: baseDurationUnits.h,
  seconds: baseDurationUnits.s,
  group: ' ',
  decimal: '.',
} as unknown as typeof parseDurationValue.unit;

const REQUIRED_ABSOLUTE_DATE_COMPONENTS: readonly Component[] = [
  'day',
  'month',
  'year',
  'hour',
  'minute',
];

const normalizeWhitespace = (value: string): string => {
  return value.trim().replaceAll(/\s+/g, ' ');
};

const stripDiacritics = (value: string): string => {
  return value.normalize('NFD').replaceAll(/\p{Diacritic}/gu, '');
};

const normalizeAbsoluteDateInput = (value: string): string => {
  return normalizeWhitespace(value);
};

const normalizeDurationInput = (value: string): string => {
  return stripDiacritics(value)
    .toLowerCase()
    .trim()
    .replaceAll(/(\d),(\d)/g, '$1.$2')
    .replaceAll(/\b(?:et|and)\b|[+,]/g, ' ')
    .replaceAll(/(\d+)\s*h\s*(\d+)(?!\s*[a-z])/g, '$1h $2m')
    .replaceAll(/\s+/g, ' ')
    .trim();
};

const parseReminderDurationValue = (value: string): number | null => {
  const previousDurationUnits = parseDurationValue.unit;

  parseDurationValue.unit = reminderDurationUnits;

  try {
    return parseDurationValue(value, 'ms');
  } finally {
    parseDurationValue.unit = previousDurationUnits;
  }
};

const matchesEntireInput = (result: ParsedResult, input: string): boolean => {
  return normalizeWhitespace(result.text).toLowerCase() === input.toLowerCase();
};

const hasFullAbsoluteDate = (result: ParsedResult): boolean => {
  return REQUIRED_ABSOLUTE_DATE_COMPONENTS.every((component) =>
    result.start.isCertain(component),
  );
};

const extractAbsoluteDate = (result: ParsedResult): Date | null => {
  const year = result.start.get('year');
  const month = result.start.get('month');
  const day = result.start.get('day');
  const hour = result.start.get('hour');
  const minute = result.start.get('minute');

  if (
    year === null ||
    month === null ||
    day === null ||
    hour === null ||
    minute === null
  ) {
    return null;
  }

  return fromZonedTime(
    `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
    PARIS_TIME_ZONE,
  );
};

const parseAbsoluteDateDuration = (input: string, now: Date): number | null => {
  const candidates = [normalizeAbsoluteDateInput(input)];
  const unaccentedCandidate = stripDiacritics(candidates[0]);

  if (unaccentedCandidate !== candidates[0]) {
    candidates.push(unaccentedCandidate);
  }

  for (const candidate of candidates) {
    const matchingResult = chronoFr
      .parse(candidate, now, {
        forwardDate: true,
      })
      .find(
        (result) =>
          matchesEntireInput(result, candidate) && hasFullAbsoluteDate(result),
      );

    if (!matchingResult) {
      continue;
    }

    const dueAt = extractAbsoluteDate(matchingResult);
    if (!dueAt) {
      continue;
    }

    return dueAt.getTime() - now.getTime();
  }

  return null;
};

export const isDurationInBounds = (durationMs: number): boolean => {
  return durationMs >= MIN_DURATION_MS && durationMs <= MAX_DURATION_MS;
};

export const parseDuration = (input: string): number | null => {
  const now = new Date();
  const absoluteDateDuration = parseAbsoluteDateDuration(input, now);

  if (absoluteDateDuration !== null) {
    return Number.isFinite(absoluteDateDuration) ? absoluteDateDuration : null;
  }

  const normalizedInput = normalizeDurationInput(input);
  if (normalizedInput.length === 0) {
    return null;
  }

  const duration = parseReminderDurationValue(normalizedInput);
  return duration !== null && Number.isFinite(duration) ? duration : null;
};

export const parseReminderId = (value: string): number | null => {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const id = Number.parseInt(value, 10);
  return Number.isSafeInteger(id) ? id : null;
};
