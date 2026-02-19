import { db } from '@/db/index.js';
import { reminders } from '@/db/schema.js';
import {
  AutocompleteOptionHandler,
  filterAutocompleteChoices,
} from '@/utils/autocomplete.js';
import { and, asc, eq } from 'drizzle-orm';

export const MIN_DURATION_MS = 60 * 1000;
export const MAX_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

const SUPPORTED_DURATION_UNITS = {
  // Seconds
  s: 's',
  sec: 's',
  secs: 's',
  second: 's',
  seconds: 's',
  seconde: 's',
  secondes: 's',
  // Minutes
  m: 'm',
  min: 'm',
  mins: 'm',
  minute: 'm',
  minutes: 'm',
  // Hours
  h: 'h',
  hr: 'h',
  hrs: 'h',
  heure: 'h',
  heures: 'h',
  hour: 'h',
  hours: 'h',
  // Days
  d: 'd',
  j: 'd',
  jour: 'd',
  jours: 'd',
  day: 'd',
  days: 'd',
  // Weeks
  w: 'w',
  sem: 'w',
  semaine: 'w',
  semaines: 'w',
  week: 'w',
  weeks: 'w',
  // Months (30 days)
  mo: 'mo',
  mois: 'mo',
  month: 'mo',
  months: 'mo',
} as const;

const DURATION_IN_MS_BY_UNIT = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
  mo: 30 * 24 * 60 * 60 * 1000,
} as const;

type SupportedUnit = keyof typeof DURATION_IN_MS_BY_UNIT;

export interface UserReminder {
  id: number;
  message: string;
  dueAt: Date;
}

export const DURATION_ERROR_MESSAGE =
  "Je n'ai pas compris la durée. Exemples valides : 1h30, 1minute30s, 3 jours et 2 heures, 30 janvier 2026 10:49.";

export const DURATION_BOUNDS_ERROR_MESSAGE =
  'La date/ durée du rappel doit être comprise entre 1 minute et 365 jours à partir de maintenant. Exemple : 1h30, 1minute30s, 30 janvier 2026 10:49.';

const MONTH_BY_NAME = {
  janvier: 1,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
} as const;

const FRENCH_WEEKDAYS =
  /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+/;

const parseAbsoluteFrenchDateTime = (input: string): number | null => {
  const normalizedInput = input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .replaceAll(/\s+/g, ' ');

  const withoutWeekday = normalizedInput.replace(FRENCH_WEEKDAYS, '');
  const dateMatch = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})$/.exec(
    withoutWeekday,
  );

  if (!dateMatch) {
    return null;
  }

  const day = Number.parseInt(dateMatch[1], 10);
  const monthName = dateMatch[2] as keyof typeof MONTH_BY_NAME;
  const year = Number.parseInt(dateMatch[3], 10);
  const hours = Number.parseInt(dateMatch[4], 10);
  const minutes = Number.parseInt(dateMatch[5], 10);

  if (!(monthName in MONTH_BY_NAME)) {
    return null;
  }

  if (
    day < 1 ||
    day > 31 ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const month = MONTH_BY_NAME[monthName];
  const targetDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    targetDate.getFullYear() !== year ||
    targetDate.getMonth() !== month - 1 ||
    targetDate.getDate() !== day ||
    targetDate.getHours() !== hours ||
    targetDate.getMinutes() !== minutes
  ) {
    return null;
  }

  return targetDate.getTime() - Date.now();
};

export const isDurationInBounds = (durationMs: number): boolean => {
  return durationMs >= MIN_DURATION_MS && durationMs <= MAX_DURATION_MS;
};

export const parseDuration = (input: string): number | null => {
  const absoluteDateDuration = parseAbsoluteFrenchDateTime(input);
  if (absoluteDateDuration !== null) {
    return Number.isFinite(absoluteDateDuration) ? absoluteDateDuration : null;
  }

  const normalizedInput = input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '');

  if (normalizedInput.length === 0) {
    return null;
  }

  const expandedInput = normalizedInput
    .replaceAll(/\b(?:et|and)\b|[+,]/g, ' ')
    .replaceAll(/(\d+)\s*h\s*(\d+)(?!\s*[a-z])/g, '$1h $2m')
    .replaceAll(/\s+/g, ' ')
    .trim();

  if (expandedInput.length === 0) {
    return null;
  }

  const tokenRegex = /(\d+)\s*([a-z]+)/g;
  const remainingInput = expandedInput
    .replaceAll(tokenRegex, '')
    .replaceAll(/\s+/g, '');

  if (remainingInput.length > 0) {
    return null;
  }

  let duration = 0;
  let hasAtLeastOneToken = false;

  for (const match of expandedInput.matchAll(tokenRegex)) {
    hasAtLeastOneToken = true;

    const value = Number.parseInt(match[1], 10);
    const rawUnit = match[2];

    if (!(rawUnit in SUPPORTED_DURATION_UNITS)) {
      return null;
    }

    const normalizedUnit: SupportedUnit =
      SUPPORTED_DURATION_UNITS[
        rawUnit as keyof typeof SUPPORTED_DURATION_UNITS
      ];

    duration += value * DURATION_IN_MS_BY_UNIT[normalizedUnit];
  }

  if (!hasAtLeastOneToken) {
    return null;
  }

  return Number.isFinite(duration) ? duration : null;
};

export const parseReminderId = (value: string): number | null => {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const id = Number.parseInt(value, 10);
  return Number.isSafeInteger(id) ? id : null;
};

export const formatReminderPreview = (
  message: string,
  maxLength = 60,
): string => {
  const normalizedMessage = message.replaceAll(/\s+/g, ' ').trim();

  if (normalizedMessage.length <= maxLength) {
    return normalizedMessage;
  }

  return `${normalizedMessage.slice(0, maxLength - 1)}…`;
};

export const formatReminderRelativeTime = (dueAt: Date): string => {
  const timestamp = Math.floor(dueAt.getTime() / 1000);
  return `<t:${String(timestamp)}:R>`;
};

export const getUserReminders = async (
  userId: string,
  guildId: string,
): Promise<UserReminder[]> => {
  return db.query.reminders.findMany({
    where: and(eq(reminders.userId, userId), eq(reminders.guildId, guildId)),
    orderBy: [asc(reminders.dueAt), asc(reminders.id)],
    columns: {
      id: true,
      message: true,
      dueAt: true,
    },
    limit: 25,
  });
};

export const getUserReminderById = async (
  reminderId: number,
  userId: string,
  guildId: string,
) => {
  return db.query.reminders.findFirst({
    where: and(
      eq(reminders.id, reminderId),
      eq(reminders.userId, userId),
      eq(reminders.guildId, guildId),
    ),
  });
};

export const handleReminderAutocomplete: AutocompleteOptionHandler = async ({
  interaction,
  focusedValue,
  subcommand,
}) => {
  if (subcommand !== 'edit' && subcommand !== 'delete') {
    return [];
  }

  const guildId = interaction.guildId;
  if (!guildId) {
    return [];
  }

  const userReminders = await getUserReminders(interaction.user.id, guildId);

  const choices = userReminders.map((reminder) => ({
    name: `#${String(reminder.id)} • ${formatReminderPreview(reminder.message)} • ${formatReminderRelativeTime(reminder.dueAt)}`,
    value: String(reminder.id),
  }));

  return filterAutocompleteChoices(choices, focusedValue);
};
