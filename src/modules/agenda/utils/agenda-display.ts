import { ensureTitleStartsWithEmoji } from '@/modules/agenda/utils/emoji-title.js';
import { getAgendaLocationPresentation } from '@/modules/agenda/utils/location-presentation.js';

export interface AgendaScheduleLabels {
  deadlineLabel?: string;
  datesLabel?: string;
  startLabel?: string;
  endLabel?: string;
}

export function buildAgendaEventHeader(params: {
  emoji: string;
  title: string;
  description?: string | null;
}): string {
  const titleWithEmoji = ensureTitleStartsWithEmoji(params.title, params.emoji);
  let header = `## ${titleWithEmoji}\n\n`;

  if (params.description) {
    header += `${params.description}\n\n`;
  }

  return header;
}

export function buildAgendaEventDetailsText(params: {
  location: string;
  schedule: AgendaScheduleLabels;
  includeHeading?: boolean;
}): string {
  const { location, schedule, includeHeading = false } = params;
  const lines: string[] = [];

  const { shouldDisplayLocation } = getAgendaLocationPresentation(location);

  if (shouldDisplayLocation) {
    lines.push(`**📍 Lieu :** ${location}`);
  }

  if (schedule.deadlineLabel) {
    lines.push(`**🕐 Échéance :** ${schedule.deadlineLabel}`);
    const body = lines.join('\n\n');
    return includeHeading ? `### Détails\n\n${body}` : body;
  }

  if (schedule.datesLabel) {
    lines.push(`**🕐 Dates :** ${schedule.datesLabel}`);
  }

  if (schedule.startLabel) {
    lines.push(`**🕐 Début :** ${schedule.startLabel}`);
  }

  if (schedule.endLabel) {
    lines.push(`**🕐 Fin :** ${schedule.endLabel}`);
  }

  const body = lines.join('\n\n');
  if (!includeHeading) {
    return body;
  }

  return body ? `### Détails\n\n${body}` : '### Détails';
}
