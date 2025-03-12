/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { CalendarComponent, fromURL } from 'node-ical';

const calendarData = await fromURL(
  'https://edt.telecomnancy.univ-lorraine.fr/static/fisa_1a.ics',
);

const today = new Date();
today.setHours(0, 0, 0, 0);

function create_lessons_from_data(data: CalendarComponent[]) {
  return data
    .map((lesson) => {
      if (lesson.type == 'VEVENT') {
        const start_time = new Date(lesson.start);
        const end_time = new Date(lesson.end);
        const formatTime = (date: Date) =>
          `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        return {
          name: lesson.summary,
          start: formatTime(start_time),
          end: formatTime(end_time),
          teacher: lesson.description.split('\n')[2],
        };
      }
    })
    .sort((a, b) => {
      if (!a || !b) return 0;
      const a_start = a.start.split(':').map((x) => parseInt(x, 10));
      const b_start = b.start.split(':').map((x) => parseInt(x, 10));
      if (a_start[0] === b_start[0]) {
        return a_start[1] - b_start[1];
      }
      return a_start[0] - b_start[0];
    });
}

export function get_today_lessons() {
  const today_data = Object.values(calendarData).filter((lesson) => {
    if (lesson.type === 'VEVENT') {
      const eventStart = new Date(lesson.start);
      eventStart.setHours(0, 0, 0, 0);
      return eventStart.getTime() === today.getTime();
    }
    return false;
  });

  const today_lessons = create_lessons_from_data(today_data);

  return today_lessons;
}
