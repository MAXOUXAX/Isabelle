import { db } from '@/db/index.js';
import { agendaEvents } from '@/db/schema.js';
import { client } from '@/index.js';
import { createLogger } from '@/utils/logger.js';
import { ChannelType } from 'discord.js';
import { and, eq, gte, lte } from 'drizzle-orm';

const logger = createLogger('thread-auto-close');

// 5 minutes
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Delay after event ends before closing thread: 24 hours
const CLOSE_DELAY_MS = 24 * 60 * 60 * 1000;

/**
 * Checks for threads that should be closed (24h after their event ended)
 * and closes them.
 */
async function checkAndCloseThreads(): Promise<void> {
  const now = new Date();
  // Find threads where:
  // - The event ended more than 24h ago
  // - The thread hasn't been closed yet
  const closeThreshold = new Date(now.getTime() - CLOSE_DELAY_MS);

  const threadsToClose = await db
    .select()
    .from(agendaEvents)
    .where(
      and(
        eq(agendaEvents.threadClosed, false),
        lte(agendaEvents.eventEndTime, closeThreshold),
      ),
    );

  if (threadsToClose.length === 0) {
    return;
  }

  logger.info(
    { count: threadsToClose.length },
    'Found threads to close after event ended',
  );

  for (const record of threadsToClose) {
    try {
      const guild = await client.guilds.fetch(record.guildId);
      const thread = await guild.channels.fetch(record.discordThreadId);

      if (!thread) {
        logger.warn(
          { threadId: record.discordThreadId, guildId: record.guildId },
          'Thread not found, marking as closed',
        );
        await markThreadAsClosed(record.guildId, record.discordEventId);
        continue;
      }

      if (
        thread.type !== ChannelType.PublicThread &&
        thread.type !== ChannelType.PrivateThread
      ) {
        logger.warn(
          { threadId: record.discordThreadId, channelType: thread.type },
          'Channel is not a thread, marking as closed',
        );
        await markThreadAsClosed(record.guildId, record.discordEventId);
        continue;
      }

      // Check if thread is already archived (closed)
      if (thread.archived) {
        logger.debug(
          { threadId: record.discordThreadId },
          'Thread already archived, marking as closed',
        );
        await markThreadAsClosed(record.guildId, record.discordEventId);
        continue;
      }

      // Close (archive) the thread
      await thread.setArchived(
        true,
        `Fermeture automatique 24h après la fin de l'événement`,
      );

      await markThreadAsClosed(record.guildId, record.discordEventId);

      logger.info(
        {
          threadId: record.discordThreadId,
          threadName: thread.name,
          guildId: record.guildId,
        },
        'Thread automatically closed 24h after event ended',
      );
    } catch (error) {
      logger.error(
        { error, threadId: record.discordThreadId, guildId: record.guildId },
        'Failed to close thread',
      );
    }
  }
}

/**
 * Reopens archived threads for upcoming events to prevent auto-archive deletion.
 */
async function keepThreadsAlive(): Promise<void> {
  const now = new Date();

  const threadsToKeep = await db
    .select()
    .from(agendaEvents)
    .where(
      and(
        eq(agendaEvents.threadClosed, false),
        gte(agendaEvents.eventEndTime, now),
      ),
    );

  if (threadsToKeep.length === 0) {
    return;
  }

  for (const record of threadsToKeep) {
    try {
      const guild = await client.guilds.fetch(record.guildId);
      const thread = await guild.channels.fetch(record.discordThreadId);

      if (!thread?.isThread()) {
        continue;
      }

      if (!thread.archived) {
        continue;
      }

      await thread.setArchived(
        false,
        "Réouverture automatique jusqu'à la fin de l'événement",
      );

      logger.info(
        {
          threadId: record.discordThreadId,
          threadName: thread.name,
          guildId: record.guildId,
        },
        'Thread reopened to keep event active',
      );
    } catch (error) {
      logger.error(
        { error, threadId: record.discordThreadId, guildId: record.guildId },
        'Failed to keep thread alive',
      );
    }
  }
}

async function markThreadAsClosed(
  guildId: string,
  eventId: string,
): Promise<void> {
  await db
    .update(agendaEvents)
    .set({ threadClosed: true })
    .where(
      and(
        eq(agendaEvents.guildId, guildId),
        eq(agendaEvents.discordEventId, eventId),
      ),
    );
}

let checkIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Starts the periodic check for threads to close.
 * Should be called once when the bot starts.
 */
export function startThreadManagementService(): void {
  if (checkIntervalId !== null) {
    logger.warn('Thread management service already running');
    return;
  }

  logger.info(
    { intervalMs: CHECK_INTERVAL_MS, delayMs: CLOSE_DELAY_MS },
    'Starting thread management service',
  );

  // Run immediately on start
  checkAndCloseThreads().catch((error: unknown) => {
    logger.error({ error }, 'Error during initial thread auto-close check');
  });

  keepThreadsAlive().catch((error: unknown) => {
    logger.error({ error }, 'Error during initial thread keep-alive check');
  });

  // Then run periodically
  checkIntervalId = setInterval(() => {
    checkAndCloseThreads().catch((error: unknown) => {
      logger.error({ error }, 'Error during periodic thread auto-close check');
    });

    keepThreadsAlive().catch((error: unknown) => {
      logger.error({ error }, 'Error during periodic thread keep-alive check');
    });
  }, CHECK_INTERVAL_MS);
}

/**
 * Stops the periodic check for threads to close.
 */
export function stopThreadAutoCloseService(): void {
  if (checkIntervalId !== null) {
    clearInterval(checkIntervalId);
    checkIntervalId = null;
    logger.info('Stopped thread auto-close service');
  }
}
