import { buildAgendaEventDetailsText } from '@/modules/agenda/utils/agenda-display.js';
import {
  formatFrenchDate,
  isDeadlineMode,
} from '@/modules/agenda/utils/date-parser.js';
import { ensureTitleStartsWithEmoji } from '@/modules/agenda/utils/emoji-title.js';
import { getAgendaLocationPresentation } from '@/modules/agenda/utils/location-presentation.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  time,
  TimestampStyles,
} from 'discord.js';

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
  const eventDateLine = `🗓️ ${time(startDate, TimestampStyles.FullDateShortTime)} (${time(startDate, TimestampStyles.RelativeTime)})`;

  let messageContent = '';

  messageContent += `${eventDateLine}\n\n`;

  if (eventDescription) {
    messageContent += `${eventDescription}\n\n`;
  }

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

  if (roleId) {
    messageContent += `\n\n<@&${roleId}>`;
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

  const threadName = ensureTitleStartsWithEmoji(eventLabel, emoji).slice(
    0,
    100,
  );

  return { messageContent, components, threadName };
}
