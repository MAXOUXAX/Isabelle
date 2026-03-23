export const MIN_DURATION_MS = 60 * 1000;
export const MAX_DURATION_MS = 365 * 24 * 60 * 60 * 1000;
export const PARIS_TIME_ZONE = 'Europe/Paris';

const ABSOLUTE_DATE_EXAMPLE_OFFSET_DAYS = 30;

const formatReminderAbsoluteDateExample = (): string => {
  const exampleDate = new Date(
    Date.now() + ABSOLUTE_DATE_EXAMPLE_OFFSET_DAYS * 24 * 60 * 60 * 1000,
  );
  exampleDate.setHours(10, 49, 0, 0);

  let day = '';
  let month = '';
  let year = '';
  let hour = '';
  let minute = '';

  for (const part of new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: PARIS_TIME_ZONE,
  }).formatToParts(exampleDate)) {
    switch (part.type) {
      case 'day':
        day = part.value;
        break;
      case 'month':
        month = part.value;
        break;
      case 'year':
        year = part.value;
        break;
      case 'hour':
        hour = part.value;
        break;
      case 'minute':
        minute = part.value;
        break;
      default:
        break;
    }
  }

  return `${day} ${month} ${year} ${hour}:${minute}`;
};

export const ABSOLUTE_DATE_EXAMPLE = formatReminderAbsoluteDateExample();

export const DURATION_ERROR_MESSAGE = `Je n'ai pas compris la durée. Exemples valides : 1h30, 1minute30s, 3 jours et 2 heures, ${ABSOLUTE_DATE_EXAMPLE}.`;

export const DURATION_BOUNDS_ERROR_MESSAGE = `La date/durée du rappel doit être comprise entre 1 minute et 365 jours à partir de maintenant. Exemple : 1h30, 1minute30s, ${ABSOLUTE_DATE_EXAMPLE}.`;
