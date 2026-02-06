import { getAgendaLocationPresentation } from '@/modules/agenda/utils/location-presentation.js';

export interface AgendaScheduleLabels {
  deadlineLabel?: string;
  startLabel?: string;
  endLabel?: string;
}

export function buildAgendaEventHeader(params: {
  emoji: string;
  title: string;
  description?: string | null;
}): string {
  let header = `## ${params.emoji} ${params.title}\n\n`;

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
  let details = includeHeading ? '### Détails\n\n' : '';

  const { shouldDisplayLocation } = getAgendaLocationPresentation(location);

  if (shouldDisplayLocation) {
    details += `\n**📍 Lieu :** ${location}`;
  }

  if (schedule.deadlineLabel) {
    details += `\n**🕐 Échéance :** ${schedule.deadlineLabel}`;
    return details;
  }

  if (schedule.startLabel) {
    details += `\n**🕐 Début :** ${schedule.startLabel}`;
  }

  if (schedule.endLabel) {
    details += `\n**🕐 Fin :** ${schedule.endLabel}`;
  }

  return details;
}
