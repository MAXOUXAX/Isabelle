import { db } from '@/db/index.js';
import { agendaEvents } from '@/db/schema.js';
import {
  DEFAULT_AGENDA_EMOJI,
  agendaAssistant,
} from '@/modules/planifier/services/ai/agenda-assistant.js';
import {
  formatFrenchDate,
  isDeadlineMode,
} from '@/modules/planifier/utils/date-parser.js';
import { parseUrl } from '@/modules/planifier/utils/url-parser.js';
import { createLogger } from '@/utils/logger.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ForumChannel,
  Guild,
  GuildScheduledEvent,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  ThreadChannel,
} from 'discord.js';
import { and, eq } from 'drizzle-orm';

const logger = createLogger('agenda-service');

interface CreateAgendaEventParams {
  guild: Guild;
  forumChannel: ForumChannel;
  eventLabel: string;
  eventDescription: string;
  eventLocation: string;
  startDate: Date;
  endDate: Date;
  roleId?: string;
}

interface CreateAgendaEventResult {
  scheduledEvent: GuildScheduledEvent;
  thread: ThreadChannel;
}

export async function createAgendaEvent({
  guild,
  forumChannel,
  eventLabel,
  eventDescription,
  eventLocation,
  startDate,
  endDate,
  roleId,
}: CreateAgendaEventParams): Promise<CreateAgendaEventResult> {
  logger.debug({ eventLabel, eventDescription }, 'Enhancing event with AI');

  const enhanced = await agendaAssistant.execute({
    title: eventLabel,
    description: eventDescription,
  });

  if (enhanced) {
    eventLabel = enhanced.title;
    eventDescription = enhanced.description;
    logger.info({ eventLabel, eventDescription }, 'Event enhanced with AI');
  } else {
    logger.warn('AI enhancement failed, using original values');
  }

  const emoji = enhanced?.emoji ?? DEFAULT_AGENDA_EMOJI;

  const scheduledEvent = await guild.scheduledEvents.create({
    name: eventLabel,
    description: eventDescription,
    entityType: GuildScheduledEventEntityType.External,
    scheduledStartTime: startDate,
    scheduledEndTime: endDate,
    entityMetadata: { location: eventLocation },
    privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
  });

  const deadlineMode = isDeadlineMode(startDate, endDate);
  const formattedStartDate = formatFrenchDate(startDate);

  let messageContent = '';

  if (roleId) {
    messageContent += `<@&${roleId}>\n`;
  }

  messageContent += `## ${emoji} ${eventLabel}\n\n`;
  messageContent += `${eventDescription}\n\n`;
  messageContent += `**📍 Lieu :** ${eventLocation}\n`;

  if (deadlineMode) {
    messageContent += `**🕐 Échéance :** ${formattedStartDate}\n`;
  } else {
    const formattedEndDate = formatFrenchDate(endDate);
    messageContent += `**🕐 Début :** ${formattedStartDate}\n`;
    messageContent += `**🕐 Fin :** ${formattedEndDate}\n`;
  }

  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  const locationUrl = parseUrl(eventLocation);

  if (locationUrl) {
    const button = new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setURL(eventLocation)
      .setLabel(`Voir sur ${locationUrl.hostname}`);
    components.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(button),
    );
  }

  const threadName = `${emoji} ${eventLabel}`.slice(0, 100);
  const thread = await forumChannel.threads.create({
    name: threadName,
    message: { content: messageContent, components },
    reason: `Événement planifié: ${eventLabel}`,
  });

  await saveAgendaEvent({
    guildId: guild.id,
    emoji,
    title: eventLabel,
    description: eventDescription,
    location: eventLocation,
    discordEventId: scheduledEvent.id,
    discordThreadId: thread.id,
    eventStartTime: startDate,
    eventEndTime: endDate,
  });

  return { scheduledEvent, thread };
}

async function saveAgendaEvent(
  event: typeof agendaEvents.$inferInsert,
): Promise<void> {
  await db
    .insert(agendaEvents)
    .values(event)
    .onConflictDoUpdate({
      target: [agendaEvents.guildId, agendaEvents.discordEventId],
      set: {
        discordThreadId: event.discordThreadId,
        eventStartTime: event.eventStartTime,
        eventEndTime: event.eventEndTime,
        threadClosed: false,
      },
    });
}

/**
 * Removes the agenda record from the database
 */
export async function deleteAgendaEvent(
  guildId: string,
  eventId: string,
): Promise<void> {
  await db
    .delete(agendaEvents)
    .where(
      and(
        eq(agendaEvents.guildId, guildId),
        eq(agendaEvents.discordEventId, eventId),
      ),
    );

  logger.debug({ guildId, eventId }, 'Removed event-thread association');
}
