import { config } from '@/config.js';
import { VEvent, fromURL } from 'node-ical';
import * as dateUtils from './date.js';

// Interface pour affichés les cours avec seulement les informations nécessaires
interface Lesson {
  name: string;
  start: string;
  end: string;
  room: string;
  teacher: string;
}

// Les données du fichier ICS
const calendarData = await fromURL(config.SCHEDULE_URL);

const today = dateUtils.startOfToday(); // Date d'aujourd'hui       Luxon : DateTime.now().startOf('day')
const startOfWeek = dateUtils.startOfCurrentWeek(); // Date du début de la semaine    Luxon : DateTime.now().startOf('week')
const endOfWeek = dateUtils.endOfCurrentWeek(); // Date de fin de la semaine   Luxon : startOfWeek.plus({ days: 4 }).endOf('day')

/*
 * Crée un tableau de cours à partir des données du fichier ICS
 */
function createLessonsFromData(data: VEvent[]): Lesson[] {
  return data.map((lesson) => {
    // Convertir les dates en version lisible
    const start_time = dateUtils.humanDate(new Date(lesson.start)); // Luxon : DateTime.fromJSDate(lesson.start).toLocaleString(DateTime.DATE_MED_WITH_WEEKDAY, {locale : 'fr'});
    const end_time = dateUtils.humanDate(new Date(lesson.end));

    return {
      name: lesson.summary,
      start: start_time,
      end: end_time,
      room: lesson.location.replace('Remicourt_', ''), // Balek du Remicourt
      teacher: lesson.description.split('\n')[2], // TODO: Trouver un moyen de récupérer le nom du prof
    };
  });
}

/*
 * Récupère les cours du jour
 */
export function getTodayClasses(): Lesson[] {
  const today_data = Object.values(calendarData).filter((lesson) => {
    if (lesson.type === 'VEVENT') {
      // Le seul type qui nous intéresse est VEVENT

      // On récupère les seulement les cours d'aujourd'hui dans le ICS
      const eventStart = dateUtils.startOfDay(new Date(lesson.start));
      return eventStart.getTime() === today.getTime();
    }
    return false;
  });

  // On crée le tableau de cours
  const today_classes = createLessonsFromData(today_data);

  if (today_classes.length === 0) {
    return [];
  }

  // On trie les cours par heure de début si le tableau n'est pas vide
  return sortTodayClasses(today_classes);
}

/*
 * Récupère les cours de la semaine
 */
export function getWeekClasses(): Record<string, Lesson[]> {
  const week_data = Object.values(calendarData).filter((lesson) => {
    if (lesson.type === 'VEVENT') {
      const eventStart = new Date(lesson.start);
      return eventStart >= startOfWeek && eventStart <= endOfWeek;
    }
    return false;
  });

  const week_classes = createLessonsFromData(week_data);

  return groupAndSortWeekClasses(week_classes);
}

/*
 * Récupère l'heure de fin du dernier cours de la journée
 */
export function getEndOfTodayClasses(): string | null {
  const lessons = getTodayClasses();

  if (lessons.length === 0) {
    return null;
  }

  return lessons[lessons.length - 1].end;
}

/*
 * Regroupe les cours par jour et les trie par heure de début
 */
function groupAndSortWeekClasses(lessons: Lesson[]): Record<string, Lesson[]> {
  const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
  const groupedLessons: Record<string, Lesson[]> = {};

  days.forEach((day) => {
    groupedLessons[day] = lessons
      .filter((lesson) => lesson.start.startsWith(day))
      .sort((a, b) => a.start.localeCompare(b.start));
  });

  return groupedLessons;
}

/*
 * Trie les cours du jour par heure de début
 */
function sortTodayClasses(lessons: Lesson[]): Lesson[] {
  return lessons.sort((a, b) => {
    return a.start.localeCompare(b.start);
  });
}
