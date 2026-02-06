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
import { buildAiFooter } from '@/utils/ai-footer.js';
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
  ThreadAutoArchiveDuration,
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
  aiOptions?: AiEnhancementOptions;
  roleId?: string;
}

interface CreateAgendaEventResult {
  scheduledEvent: GuildScheduledEvent;
  thread: ThreadChannel;
}

export interface AiEnhancementOptions {
  enhanceText: boolean;
  enhanceEmoji: boolean;
}

interface AgendaAssistantResult {
  title: string;
  description: string;
  emoji: string;
  totalTokens: number;
  modelVersion?: string;
}

function isAgendaAssistantOutput(
  value: unknown,
): value is AgendaAssistantResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'title' in value &&
    typeof value.title === 'string' &&
    'description' in value &&
    typeof value.description === 'string' &&
    'emoji' in value &&
    typeof value.emoji === 'string' &&
    'totalTokens' in value &&
    typeof value.totalTokens === 'number' &&
    (!('modelVersion' in value) ||
      typeof (value as { modelVersion?: unknown }).modelVersion === 'string')
  );
}

export async function createAgendaEvent({
  guild,
  forumChannel,
  eventLabel,
  eventDescription,
  eventLocation,
  startDate,
  endDate,
  aiOptions = { enhanceText: true, enhanceEmoji: true },
  roleId,
}: CreateAgendaEventParams): Promise<CreateAgendaEventResult> {
  let enhanced: AgendaAssistantResult | null = null;
  let aiUsed = false;

  if (aiOptions.enhanceText || aiOptions.enhanceEmoji) {
    logger.debug({ eventLabel, eventDescription }, 'Enhancing event with AI');
    const enhancedResult = await agendaAssistant.execute({
      title: eventLabel,
      description: eventDescription,
    });

    enhanced = isAgendaAssistantOutput(enhancedResult) ? enhancedResult : null;

    if (enhanced) {
      aiUsed = true;
      logger.info({ eventLabel, eventDescription }, 'Event enhanced with AI');
    } else {
      logger.warn('AI enhancement failed, using original values');
    }
  }

  if (enhanced && aiOptions.enhanceText) {
    eventLabel = enhanced.title;
    eventDescription = enhanced.description;
  }

  const emoji = aiOptions.enhanceEmoji
    ? (enhanced?.emoji ?? DEFAULT_AGENDA_EMOJI)
    : DEFAULT_AGENDA_EMOJI;

  const scheduledEvent = await guild.scheduledEvents.create({
    name: eventLabel,
    description: eventDescription,
    entityType: GuildScheduledEventEntityType.External,
    scheduledStartTime: startDate,
    scheduledEndTime: endDate,
    entityMetadata: { location: eventLocation },
    privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
  });

  const aiTokens = enhanced?.totalTokens ?? 0;
  const aiModelVersion = enhanced?.modelVersion;

  const aiFooter = aiUsed
    ? buildAiFooter({
        disclaimer:
          "Ce contenu a été amélioré par une intelligence artificielle et peut contenir des erreurs. Vérifie les informations importantes avant de t'y fier.",
        totalTokens: aiTokens,
        modelVersion: aiModelVersion,
      })
    : undefined;

  const { messageContent, components, threadName } = buildThreadMessage({
    eventLabel,
    eventDescription,
    eventLocation,
    startDate,
    endDate,
    emoji,
    roleId,
    aiFooter,
  });
  const thread = await forumChannel.threads.create({
    name: threadName,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
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

interface UpdateAgendaEventParams {
  guild: Guild;
  eventId: string;
  eventLabel: string;
  eventDescription: string;
  eventLocation: string;
  startDate: Date;
  endDate: Date;
  aiOptions?: AiEnhancementOptions;
  roleId?: string;
  baseEmoji: string;
  threadId: string;
}

export async function updateAgendaEvent({
  guild,
  eventId,
  eventLabel,
  eventDescription,
  eventLocation,
  startDate,
  endDate,
  aiOptions = { enhanceText: false, enhanceEmoji: false },
  roleId,
  baseEmoji,
  threadId,
}: UpdateAgendaEventParams): Promise<CreateAgendaEventResult> {
  let enhanced: AgendaAssistantResult | null = null;
  let aiUsed = false;

  if (aiOptions.enhanceText || aiOptions.enhanceEmoji) {
    logger.debug({ eventLabel, eventDescription }, 'Enhancing event with AI');
    const enhancedResult = await agendaAssistant.execute({
      title: eventLabel,
      description: eventDescription,
    });

    enhanced = isAgendaAssistantOutput(enhancedResult) ? enhancedResult : null;

    if (enhanced) {
      aiUsed = true;
      logger.info({ eventLabel, eventDescription }, 'Event enhanced with AI');
    } else {
      logger.warn('AI enhancement failed, using original values');
    }
  }

  if (enhanced && aiOptions.enhanceText) {
    eventLabel = enhanced.title;
    eventDescription = enhanced.description;
  }

  const emoji = aiOptions.enhanceEmoji
    ? (enhanced?.emoji ?? baseEmoji)
    : baseEmoji;

  const scheduledEvent = await guild.scheduledEvents.fetch(eventId);
  await scheduledEvent.edit({
    name: eventLabel,
    description: eventDescription,
    scheduledStartTime: startDate,
    scheduledEndTime: endDate,
    entityMetadata: { location: eventLocation },
  });

  const aiTokens = enhanced?.totalTokens ?? 0;
  const aiModelVersion = enhanced?.modelVersion;

  const aiFooter = aiUsed
    ? buildAiFooter({
        disclaimer:
          "Ce contenu a été amélioré par une intelligence artificielle et peut contenir des erreurs. Vérifie les informations importantes avant de t'y fier.",
        totalTokens: aiTokens,
        modelVersion: aiModelVersion,
      })
    : undefined;

  const { messageContent, components, threadName } = buildThreadMessage({
    eventLabel,
    eventDescription,
    eventLocation,
    startDate,
    endDate,
    emoji,
    roleId,
    aiFooter,
  });

  const thread = await guild.channels.fetch(threadId);
  if (!thread?.isThread()) {
    throw new Error('Thread introuvable pour mise à jour');
  }

  await thread.setName(threadName);

  const starterMessage = await thread.fetchStarterMessage();
  if (starterMessage) {
    await starterMessage.edit({ content: messageContent, components });
  }

  await db
    .update(agendaEvents)
    .set({
      title: eventLabel,
      description: eventDescription,
      location: eventLocation,
      emoji,
      eventStartTime: startDate,
      eventEndTime: endDate,
      threadClosed: false,
    })
    .where(
      and(
        eq(agendaEvents.guildId, guild.id),
        eq(agendaEvents.discordEventId, eventId),
      ),
    );

  return { scheduledEvent, thread };
}

interface ThreadMessagePayload {
  eventLabel: string;
  eventDescription: string;
  eventLocation: string;
  startDate: Date;
  endDate: Date;
  emoji: string;
  roleId?: string;
  aiFooter?: string;
}

function buildThreadMessage({
  eventLabel,
  eventDescription,
  eventLocation,
  startDate,
  endDate,
  emoji,
  roleId,
  aiFooter,
}: ThreadMessagePayload): {
  messageContent: string;
  components: ActionRowBuilder<ButtonBuilder>[];
  threadName: string;
} {
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

  if (aiFooter) {
    messageContent += aiFooter;
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

  return { messageContent, components, threadName };
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
