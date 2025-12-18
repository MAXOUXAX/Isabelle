import { config } from '@/config.js';
import { cacheStore } from '@/utils/cache.js';
import { createLogger } from '@/utils/logger.js';
import { ColorResolvable, EmbedBuilder } from 'discord.js';
import { VEvent, fromURL } from 'node-ical';
import * as dateUtils from './date.js';
import { humanDate, humanTime } from './date.js';

const logger = createLogger('schedule');

// Interface pour afficher les cours avec seulement les informations nécessaires
export interface Lesson {
  name: string;
  start: Date;
  end: Date;
  room: string;
  teacher: string;
  color: string;
}

export const SCHEDULE_CACHE_KEY = 'calendarData';

const cacheEntry = cacheStore.useCache(
  SCHEDULE_CACHE_KEY,
  getSchedule,
  1000 * 60 * 60 * 24,
);

/**
 * Crée un embed Discord pour afficher un cours
 * @param lesson Le cours à afficher
 * @param options Options de formatage
 * @param options.useShortTime Si true, affiche seulement l'heure (HH:MM) au lieu de la date complète
 * @returns Un EmbedBuilder configuré avec les informations du cours
 */
export function createLessonEmbed(
  lesson: Lesson,
  options?: { useShortTime?: boolean },
): EmbedBuilder {
  const timeFormatter = options?.useShortTime ? humanTime : humanDate;

  return new EmbedBuilder()
    .setTitle(lesson.name)
    .addFields(
      { name: 'Début', value: timeFormatter(lesson.start) },
      { name: 'Fin', value: timeFormatter(lesson.end) },
      { name: 'Salle', value: lesson.room },
      { name: 'Enseignant', value: lesson.teacher || 'N/A' },
    )
    .setColor(lesson.color as ColorResolvable);
}

/**
 * Crée un tableau d'embeds Discord pour afficher plusieurs cours
 * @param lessons Les cours à afficher
 * @param options Options de formatage
 * @param options.useShortTime Si true, affiche seulement l'heure (HH:MM) au lieu de la date complète
 * @returns Un tableau d'EmbedBuilder configurés
 */
export function createLessonEmbeds(
  lessons: Lesson[],
  options?: { useShortTime?: boolean },
): EmbedBuilder[] {
  return lessons.map((lesson) => createLessonEmbed(lesson, options));
}

// Règles d'ajustement des horaires
interface TimeAdjustmentRule {
  matchHour: number;
  matchMinute: number;
  appliesTo: 'start' | 'end';
  setHour: number;
  setMinute: number;
}

const TIME_ADJUSTMENT_RULES: TimeAdjustmentRule[] = [
  // Pause matinale
  {
    matchHour: 10,
    matchMinute: 0,
    appliesTo: 'start',
    setHour: 10,
    setMinute: 10,
  }, // Début 10h → 10h10
  {
    matchHour: 10,
    matchMinute: 0,
    appliesTo: 'end',
    setHour: 9,
    setMinute: 50,
  }, // Fin 10h → 9h50
  // Pause après-midi
  {
    matchHour: 16,
    matchMinute: 0,
    appliesTo: 'start',
    setHour: 16,
    setMinute: 10,
  }, // Début 16h → 16h10
  {
    matchHour: 16,
    matchMinute: 0,
    appliesTo: 'end',
    setHour: 15,
    setMinute: 50,
  }, // Fin 16h → 15h50
];

/*
 * Ajuste l'heure selon les règles configurées
 */
function adjustTime(
  date: Date,
  type: 'start' | 'end',
  rules: TimeAdjustmentRule[],
): Date {
  for (const rule of rules) {
    if (
      rule.appliesTo === type &&
      date.getHours() === rule.matchHour &&
      date.getMinutes() === rule.matchMinute
    ) {
      const adjusted = new Date(date);
      adjusted.setHours(rule.setHour, rule.setMinute, 0, 0);
      return adjusted;
    }
  }
  return new Date(date);
}

/*
 * Ajuste les horaires virtuels du calendrier ICS selon les règles configurées
 */
function adjustSchedule(
  startDate: Date,
  endDate: Date,
): { start: Date; end: Date } {
  const adjustedStart = adjustTime(startDate, 'start', TIME_ADJUSTMENT_RULES);
  const adjustedEnd = adjustTime(endDate, 'end', TIME_ADJUSTMENT_RULES);

  return { start: adjustedStart, end: adjustedEnd };
}

/*
 * Extrait le nom du professeur de la description
 */
function extractTeacherName(
  description: string | undefined,
  summary: string,
): string {
  if (!description) return '';

  const lines = description
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Patterns à ignorer
  const ignorePatterns = [
    // Métadonnées et IDs
    /^\d+$/, // IDs numériques
    /^\(Modifié le:/i,
    /^\(Exporté le:/i,

    // Groupes et Promos
    /TELECOM/i,
    /Apprentis/i,
    /FISEA/i,
    /FISA/i,
    /\b\d[A]\b/i, // 1A, 2A, 3A
  ];

  const candidates = lines.filter((l) => {
    if (l.toLowerCase() === summary.toLowerCase()) return false;
    for (const pattern of ignorePatterns) {
      if (pattern.test(l)) return false;
    }
    return true;
  });

  const explicit = lines.find((l) => /^Enseignant\s?:/i.test(l));
  if (explicit) {
    return explicit.replace(/^Enseignant\s?:/i, '').trim();
  }

  if (candidates.length > 0) {
    return candidates[0];
  }

  return '';
}

/*
 * Crée un tableau de cours à partir des données du fichier ICS
 */
function createLessonsFromData(data: VEvent[]): Lesson[] {
  return data.map((lesson) => {
    const startDate = new Date(lesson.start);
    const endDate = new Date(lesson.end);

    const { start, end } = adjustSchedule(startDate, endDate);

    return {
      name: lesson.summary,
      start,
      end,
      room: lesson.location.replaceAll('Remicourt_', '').toUpperCase(), // Balek du Remicourt
      teacher: extractTeacherName(lesson.description, lesson.summary),
      color: getLessonColor(lesson.summary),
    };
  });
}

/*
 * Récupère les cours du jour
 */
export async function getTodaysLessons(): Promise<Lesson[]> {
  const calendarData = await cacheEntry.get();

  const today = dateUtils.startOfToday();

  if (!calendarData) {
    logger.error('Calendar data is undefined');
    return [];
  }

  const todayData: VEvent[] = Object.values(calendarData).filter(
    (lesson): lesson is VEvent => {
      if (lesson.type === 'VEVENT') {
        // Le seul type qui nous intéresse est VEVENT

        // On récupère les seulement les cours d'aujourd'hui dans le ICS
        const eventStart = dateUtils.startOfDay(new Date(lesson.start));
        return eventStart.getTime() === today.getTime();
      }
      return false;
    },
  );

  // On crée le tableau de cours
  const todaysClasses = createLessonsFromData(todayData);

  if (todaysClasses.length === 0) {
    return [];
  }

  // On trie les cours par heure de début si le tableau n'est pas vide
  return sortLessons(todaysClasses);
}

export async function getLessonsFromDate(date: Date): Promise<Lesson[]> {
  const calendarData = await cacheEntry.get();
  const targetDate = dateUtils.startOfDay(date);

  if (!calendarData) {
    logger.error('Calendar data is undefined');
    return [];
  }

  const dateData: VEvent[] = Object.values(calendarData).filter(
    (lesson): lesson is VEvent => {
      if (lesson.type === 'VEVENT') {
        const eventStart = dateUtils.startOfDay(new Date(lesson.start));
        return eventStart.getTime() === targetDate.getTime();
      }
      return false;
    },
  );

  const classes = createLessonsFromData(dateData);

  if (classes.length === 0) {
    return [];
  }

  return sortLessons(classes);
}

export async function getTomorrowsLessons(): Promise<Lesson[]> {
  const tomorrow = dateUtils.addDays(new Date(), 1);
  return await getLessonsFromDate(tomorrow);
}

/*
 * Récupère les cours de la semaine
 */
export async function getWeekLessons(): Promise<Record<string, Lesson[]>> {
  const calendarData = await cacheEntry.get();
  const startOfWeek = dateUtils.startOfCurrentWeek();
  const endOfWeek = dateUtils.endOfCurrentWeek();

  if (!calendarData) {
    logger.error('Calendar data is undefined');
    return {};
  }

  const weekData: VEvent[] = Object.values(calendarData).filter(
    (lesson): lesson is VEvent => {
      if (lesson.type === 'VEVENT') {
        const eventStart = new Date(lesson.start);
        return eventStart >= startOfWeek && eventStart <= endOfWeek;
      }
      return false;
    },
  );

  const weekClasses = createLessonsFromData(weekData);

  return groupAndSortWeekLessons(weekClasses);
}

/*
 * Récupère l'heure de fin du dernier cours de la journée
 */
export async function getEndOfTodayLessons(): Promise<Date | null> {
  const lessons = await getTodaysLessons();

  if (lessons.length === 0) {
    return null;
  }

  return lessons[lessons.length - 1].end;
}

/*
 * Récupère le prochain cours
 */

export async function getTodaysNextLesson() {
  const now = new Date();
  const lessons = await getTodaysLessons();

  const nextLessons = lessons.filter((lesson) => lesson.start > now);

  if (nextLessons.length === 0) {
    return null;
  }

  return nextLessons[0];
}

/*
 * Regroupe les cours par jour et les trie par heure de début
 */
function groupAndSortWeekLessons(lessons: Lesson[]): Record<string, Lesson[]> {
  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
  const groupedLessons: Record<string, Lesson[]> = {};

  days.forEach((day) => {
    groupedLessons[day] = lessons
      .filter((lesson) => lesson.start.getDay() === days.indexOf(day) + 1)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  });

  return groupedLessons;
}

/*
 * Trie les cours du jour par heure de début
 */
function sortLessons(lessons: Lesson[]): Lesson[] {
  return lessons.sort((a, b) => {
    return a.start.getTime() - b.start.getTime();
  });
}

function getLessonColor(title: string): string {
  const titleLower = title.toLowerCase();

  if (/note|noté|examen/.test(titleLower)) {
    return '#e60000';
  } else if (titleLower.includes('cm')) {
    return '#ff8000';
  } else if (titleLower.includes('td')) {
    return '#008000';
  } else if (titleLower.includes('tp')) {
    return '#0066cc';
  } else if (/periode|période/.test(titleLower)) {
    return '#663300';
  } else if (titleLower.includes('anglais')) {
    return '#9966ff';
  } else {
    return '#660066';
  }
}

async function getSchedule() {
  return await fromURL(config.SCHEDULE_URL);
}
