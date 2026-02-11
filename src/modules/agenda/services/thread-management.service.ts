import { db } from '@/db/index.js';
import { agendaEvents } from '@/db/schema.js';
import { client } from '@/index.js';
import { createLogger } from '@/utils/logger.js';
import { ChannelType, DiscordAPIError, ThreadChannel } from 'discord.js';
import { and, eq, gte, lte } from 'drizzle-orm';

const logger = createLogger('thread-auto-close');

// 5 minutes
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Delay after event ends before closing thread: 24 hours
const CLOSE_DELAY_MS = 24 * 60 * 60 * 1000;
const ARCHIVE_DELAY_MS = 150;
const ARCHIVE_MAX_RETRIES = 3;
const ARCHIVE_BACKOFF_BASE_MS = 500;

const wait = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

async function setArchivedWithRetry(
  thread: ThreadChannel,
  archived: boolean,
  reason: string,
): Promise<void> {
  let attempt = 0;

  while (attempt <= ARCHIVE_MAX_RETRIES) {
    try {
      await thread.setArchived(archived, reason);
      return;
    } catch (error) {
      const isRateLimit =
        error instanceof DiscordAPIError && error.status === 429;
      const isServerError =
        error instanceof DiscordAPIError && error.status >= 500;
      const isRetryable = isRateLimit || isServerError;

      if (!isRetryable || attempt === ARCHIVE_MAX_RETRIES) {
        throw error;
      }

      const backoffMs = ARCHIVE_BACKOFF_BASE_MS * 2 ** attempt;
      logger.warn(
        {
          attempt: attempt + 1,
          threadId: thread.id,
          backoffMs,
          archived,
        },
        'Rate limited while updating thread archive state, backing off',
      );
      await wait(backoffMs);
      attempt += 1;
    }
  }
}

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
      const thread = await fetchThread(record.guildId, record.discordThreadId);

      if (!thread) {
        await markThreadAsClosed(record.guildId, record.discordEventId);
        continue;
      }

      if (thread.archived) {
        logger.debug(
          { threadId: record.discordThreadId },
          'Thread already archived, marking as closed',
        );
        await markThreadAsClosed(record.guildId, record.discordEventId);
        continue;
      }

      await setArchivedWithRetry(
        thread,
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

    await wait(ARCHIVE_DELAY_MS);
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
      const thread = await fetchThread(record.guildId, record.discordThreadId);

      if (!thread?.archived) {
        continue;
      }

      await setArchivedWithRetry(
        thread,
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

    await wait(ARCHIVE_DELAY_MS);
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

async function fetchThread(
  guildId: string,
  threadId: string,
): Promise<ThreadChannel | null> {
  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(threadId);

  if (!channel) {
    logger.warn({ threadId, guildId }, 'Thread not found, marking as closed');
    return null;
  }

  if (
    channel.type !== ChannelType.PublicThread &&
    channel.type !== ChannelType.PrivateThread
  ) {
    logger.warn(
      { threadId, channelType: channel.type },
      'Channel is not a thread, marking as closed',
    );
    return null;
  }

  return channel;
}

let checkIntervalId: ReturnType<typeof setTimeout> | null = null;
let isThreadManagementRunning = false;

async function runThreadManagementCycle(): Promise<void> {
  if (isThreadManagementRunning) {
    logger.warn('Thread management service already running');
    return;
  }

  isThreadManagementRunning = true;

  try {
    await checkAndCloseThreads();
  } catch (error) {
    logger.error({ error }, 'Error during thread auto-close check');
  }

  try {
    await keepThreadsAlive();
  } catch (error) {
    logger.error({ error }, 'Error during thread keep-alive check');
  }

  isThreadManagementRunning = false;

  if (checkIntervalId !== null) {
    checkIntervalId = setTimeout(() => {
      void runThreadManagementCycle();
    }, CHECK_INTERVAL_MS);
  }
}

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

  checkIntervalId = setTimeout(() => {
    void runThreadManagementCycle();
  }, 0);
}

/**
 * Stops the periodic check for threads to close.
 */
export function stopThreadManagementService(): void {
  if (checkIntervalId === null) {
    logger.warn('Thread management service already stopped');
    return;
  }

  clearTimeout(checkIntervalId);
  checkIntervalId = null;

  logger.info('Thread management service stopped');
}
