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

const cacheEntry = cacheStore.cache(
  SCHEDULE_CACHE_KEY,
  getSchedule,
  1000 * 60 * 60 * 24,
);

/*
 * Crée un tableau de cours à partir des données du fichier ICS
 */
function createLessonsFromData(data: VEvent[]): Lesson[] {
  return data.map((lesson) => {
    return {
      name: lesson.summary,
      start: new Date(lesson.start),
      end: new Date(lesson.end),
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

  const todayData = Object.values(calendarData).filter((lesson) => {
    if (lesson.type === 'VEVENT') {
      // Le seul type qui nous intéresse est VEVENT

      // On récupère les seulement les cours d'aujourd'hui dans le ICS
      const eventStart = dateUtils.startOfDay(new Date(lesson.start));
      return eventStart.getTime() === today.getTime();
    }
    return false;
  });

  // On crée le tableau de cours
  const todaysClasses = createLessonsFromData(todayData);

  if (todaysClasses.length === 0) {
    return [];
  }

  // On trie les cours par heure de début si le tableau n'est pas vide
  return sortLessons(todaysClasses);
}

/*
 * Récupère les cours de la semaine
 */
export async function getWeekLessons(): Promise<Record<string, Lesson[]>> {
  const calendarData = await cacheEntry.get();
  const startOfWeek = dateUtils.startOfCurrentWeek();
  const endOfWeek = dateUtils.endOfCurrentWeek();

  const weekData = Object.values(calendarData).filter((lesson) => {
    if (lesson.type === 'VEVENT') {
      const eventStart = new Date(lesson.start);
      return eventStart >= startOfWeek && eventStart <= endOfWeek;
    }
    return false;
  });

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
