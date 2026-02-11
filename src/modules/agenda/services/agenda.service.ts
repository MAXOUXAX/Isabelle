import { db } from '@/db/index.js';
import { agendaEvents } from '@/db/schema.js';
import { buildAgendaThreadMessage } from '@/modules/agenda/messages/agenda-thread-message.js';
import {
  applyAiEnhancements,
  type AiEnhancementOptions,
} from '@/modules/agenda/services/agenda-ai.service.js';
import { AgendaUserError } from '@/modules/agenda/utils/agenda-errors.js';
import { createLogger } from '@/utils/logger.js';
import {
  ChannelType,
  ForumChannel,
  Guild,
  GuildScheduledEvent,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  ThreadAutoArchiveDuration,
  ThreadChannel,
} from 'discord.js';
import { and, eq, gte } from 'drizzle-orm';

const logger = createLogger('agenda-service');

type AgendaEventRecord = typeof agendaEvents.$inferSelect;

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
  const { title, description, emoji, footer } = await applyAiEnhancements({
    title: eventLabel,
    description: eventDescription,
    options: aiOptions,
  });

  const scheduledEvent = await guild.scheduledEvents.create({
    name: title,
    description,
    entityType: GuildScheduledEventEntityType.External,
    scheduledStartTime: startDate,
    scheduledEndTime: endDate,
    entityMetadata: { location: eventLocation },
    privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
  });

  const { messageContent, components, threadName } = buildAgendaThreadMessage({
    eventLabel: title,
    eventDescription: description,
    eventLocation,
    startDate,
    endDate,
    emoji,
    roleId,
    aiFooter: footer,
  });

  const thread = await forumChannel.threads.create({
    name: threadName,
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
    message: { content: messageContent, components },
    reason: `Événement planifié: ${eventLabel}`,
  });

  await upsertAgendaEvent({
    guildId: guild.id,
    emoji,
    title,
    description,
    location: eventLocation,
    discordEventId: scheduledEvent.id,
    discordThreadId: thread.id,
    eventStartTime: startDate,
    eventEndTime: endDate,
  });

  return { scheduledEvent, thread };
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
  const { title, description, emoji, footer } = await applyAiEnhancements({
    title: eventLabel,
    description: eventDescription,
    options: aiOptions,
    baseEmoji,
  });

  let scheduledEvent: GuildScheduledEvent;

  try {
    scheduledEvent = await guild.scheduledEvents.fetch(eventId);
  } catch (error) {
    logger.warn(
      { error, eventId, guildId: guild.id },
      'Scheduled event not found while updating',
    );
    throw new AgendaUserError(
      'Événement Discord introuvable. Il a peut-être été supprimé.',
    );
  }
  await scheduledEvent.edit({
    name: title,
    description,
    scheduledStartTime: startDate,
    scheduledEndTime: endDate,
    entityMetadata: { location: eventLocation },
  });

  const { messageContent, components, threadName } = buildAgendaThreadMessage({
    eventLabel: title,
    eventDescription: description,
    eventLocation,
    startDate,
    endDate,
    emoji,
    roleId,
    aiFooter: footer,
  });

  const thread = await guild.channels.fetch(threadId);
  if (!thread?.isThread()) {
    throw new AgendaUserError('Thread introuvable pour mise à jour');
  }

  await thread.setName(threadName);

  const starterMessage = await thread.fetchStarterMessage();
  if (starterMessage) {
    await starterMessage.edit({ content: messageContent, components });
  }

  await db
    .update(agendaEvents)
    .set({
      title,
      description,
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

async function upsertAgendaEvent(
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

export async function fetchUpcomingAgendaEvents(
  guildId: string,
  referenceDate: Date = new Date(),
): Promise<AgendaEventRecord[]> {
  return db
    .select()
    .from(agendaEvents)
    .where(
      and(
        eq(agendaEvents.guildId, guildId),
        gte(agendaEvents.eventEndTime, referenceDate),
      ),
    )
    .orderBy(agendaEvents.eventStartTime);
}

export async function findAgendaEventByDiscordId(
  guildId: string,
  eventId: string,
): Promise<AgendaEventRecord | null> {
  const events = await db
    .select()
    .from(agendaEvents)
    .where(
      and(
        eq(agendaEvents.guildId, guildId),
        eq(agendaEvents.discordEventId, eventId),
      ),
    )
    .limit(1);

  return events.at(0) ?? null;
}

async function deleteAssociatedThread(
  guild: Guild,
  threadId: string,
  eventName: string,
): Promise<boolean> {
  try {
    const thread = await guild.channels.fetch(threadId);
    if (thread?.isThread()) {
      await thread.delete(`Suppression de l'événement associé: ${eventName}`);
      return true;
    }
  } catch (error) {
    logger.warn(
      { error, threadId },
      'Failed to delete associated thread by id',
    );
  }

  return false;
}

export async function deleteAgendaEventResources({
  guild,
  eventId,
  forumChannelId,
  eventRecord,
}: {
  guild: Guild;
  eventId: string;
  forumChannelId?: string | null;
  eventRecord?: AgendaEventRecord | null;
}): Promise<{ eventName: string; threadDeleted: boolean }> {
  const record =
    eventRecord ?? (await findAgendaEventByDiscordId(guild.id, eventId));

  let eventName = record?.title ?? eventId;

  try {
    const scheduledEvent = await guild.scheduledEvents.fetch(eventId);
    eventName = scheduledEvent.name;
    await scheduledEvent.delete();
  } catch (error) {
    logger.debug(
      { error, eventId, guildId: guild.id },
      'Scheduled event already deleted',
    );
  }
  await deleteAgendaEvent(guild.id, eventId);

  let threadDeleted = false;

  if (record?.discordThreadId) {
    threadDeleted = await deleteAssociatedThread(
      guild,
      record.discordThreadId,
      eventName,
    );
  } else if (forumChannelId) {
    try {
      const forum = await guild.channels.fetch(forumChannelId);
      if (forum?.type === ChannelType.GuildForum) {
        const { threads } = await forum.threads.fetchActive();
        const matchingThread = threads.find(
          (t) => t.name === eventName || t.name.endsWith(` ${eventName}`),
        );

        if (matchingThread) {
          await matchingThread.delete(
            `Suppression de l'événement associé: ${eventName}`,
          );
          threadDeleted = true;
        }
      }
    } catch (error) {
      logger.warn(
        { error, forumChannelId },
        'Failed to find or delete associated forum thread',
      );
    }
  }

  return { eventName, threadDeleted };
}

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
