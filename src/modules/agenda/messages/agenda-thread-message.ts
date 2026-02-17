import {
  buildAgendaEventDetailsText,
  buildAgendaEventHeader,
} from '@/modules/agenda/utils/agenda-display.js';
import {
  formatFrenchDate,
  isDeadlineMode,
} from '@/modules/agenda/utils/date-parser.js';
import { getAgendaLocationPresentation } from '@/modules/agenda/utils/location-presentation.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export interface ThreadMessagePayload {
  eventLabel: string;
  eventDescription: string;
  eventLocation: string;
  startDate: Date;
  endDate: Date;
  emoji: string;
  roleId?: string;
  aiFooter?: string;
}

export interface ThreadMessageResult {
  messageContent: string;
  components: ActionRowBuilder<ButtonBuilder>[];
  threadName: string;
}

export function buildAgendaThreadMessage({
  eventLabel,
  eventDescription,
  eventLocation,
  startDate,
  endDate,
  emoji,
  roleId,
  aiFooter,
}: ThreadMessagePayload): ThreadMessageResult {
  const deadlineMode = isDeadlineMode(startDate, endDate);
  const formattedStartDate = formatFrenchDate(startDate);
  const formattedEndDate = deadlineMode ? undefined : formatFrenchDate(endDate);

  let messageContent = '';

  if (roleId) {
    messageContent += `<@&${roleId}>\n`;
  }

  messageContent += buildAgendaEventHeader({
    emoji,
    title: eventLabel,
    description: eventDescription,
  });

  messageContent += buildAgendaEventDetailsText({
    location: eventLocation,
    schedule: {
      deadlineLabel: deadlineMode ? formattedStartDate : undefined,
      startLabel: deadlineMode ? undefined : formattedStartDate,
      endLabel: formattedEndDate,
    },
  });

  if (aiFooter) {
    messageContent += aiFooter;
  }

  const components: ActionRowBuilder<ButtonBuilder>[] = [];

  const { locationUrl } = getAgendaLocationPresentation(eventLocation);
  if (locationUrl) {
    components.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setURL(eventLocation)
          .setLabel(`Voir sur ${locationUrl.hostname}`),
      ),
    );
  }

  const normalizedLabel = eventLabel.trim();
  const threadName = (
    normalizedLabel.startsWith(emoji)
      ? normalizedLabel
      : `${emoji} ${normalizedLabel}`
  ).slice(0, 100);

  return { messageContent, components, threadName };
}
