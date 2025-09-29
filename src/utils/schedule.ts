import { config } from '@/config.js';
import { cacheStore } from '@/utils/cache.js';
import { VEvent, fromURL } from 'node-ical';
import * as dateUtils from './date.js';

// Interface pour afficher les cours avec seulement les informations nécessaires
interface Lesson {
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

/*
 * Crée un tableau de cours à partir des données du fichier ICS
 * Ajuste les horaires virtuels du calendrier ICS selon les règles TELECOM Nancy:
 * - Fin 10h → 9h50 (pause matinale)
 * - Début 10h → 10h10 (après pause matinale)
 * - Fin 16h → 15h50 (pause après-midi)
 * - Début 16h → 16h10 (après pause après-midi)
 */
function createLessonsFromData(data: VEvent[]): Lesson[] {
  return data.map((lesson) => {
    const startDate = new Date(lesson.start);
    const endDate = new Date(lesson.end);

    // Ajustement des horaires selon les règles TELECOM Nancy
    const adjustedStart = new Date(startDate);
    const adjustedEnd = new Date(endDate);

    // Règles pour 10h (pause matinale 9h50-10h10)
    if (startDate.getHours() === 10 && startDate.getMinutes() === 0) {
      adjustedStart.setHours(10, 10, 0, 0); // Début 10h → 10h10
    }
    if (endDate.getHours() === 10 && endDate.getMinutes() === 0) {
      adjustedEnd.setHours(9, 50, 0, 0); // Fin 10h → 9h50
    }

    // Règles pour 16h (pause après-midi 15h50-16h10)
    if (startDate.getHours() === 16 && startDate.getMinutes() === 0) {
      adjustedStart.setHours(16, 10, 0, 0); // Début 16h → 16h10
    }
    if (endDate.getHours() === 16 && endDate.getMinutes() === 0) {
      adjustedEnd.setHours(15, 50, 0, 0); // Fin 16h → 15h50
    }

    return {
      name: lesson.summary,
      start: adjustedStart,
      end: adjustedEnd,
      room: lesson.location.replaceAll('Remicourt_', '').toUpperCase(), // Balek du Remicourt
      teacher: lesson.description.split('\n')[2], // TODO: Trouver un moyen de récupérer le nom du prof
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
    console.error('Calendar data is undefined');
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
    console.error('Calendar data is undefined');
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
    console.error('Calendar data is undefined');
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
