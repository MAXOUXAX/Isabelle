import { db } from '@/db/index.js';
import { roastUsage } from '@/db/schema.js';
import {
  DAY_IN_MS,
  fromDrizzleDate,
  HOUR_IN_MS,
  timeUntilNextUse,
} from '@/utils/date.js';
import { createLogger } from '@/utils/logger.js';
import {
  InteractionReplyOptions,
  MessageFlags,
  time,
  TimestampStyles,
} from 'discord.js';

const logger = createLogger('roast-throttle');

export async function checkRoastQuota(
  guildId: string,
  userId: string,
  maxRoastsPerDay: number,
): Promise<InteractionReplyOptions | null> {
  const lastUsage = await db.query.roastUsage.findFirst({
    where: (table, { and, eq }) =>
      and(eq(table.guildId, guildId), eq(table.userId, userId)),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  logger.debug({ guildId, userId, lastUsage }, 'Last roast usage fetched');

  if (lastUsage) {
    const lastUsageDate = fromDrizzleDate(lastUsage.createdAt);
    const timeSinceLastUsage = Date.now() - lastUsageDate.getTime();

    if (timeSinceLastUsage < HOUR_IN_MS) {
      return {
        content:
          'On reste gentil avec les copains. Tu devras attendre un peu avant de roast à nouveau.',
        flags: MessageFlags.Ephemeral,
      };
    }
  }

  const dayThreshold = new Date(Date.now() - DAY_IN_MS);

  const rows = await db.query.roastUsage.findMany({
    where: (table, { and, eq, gt }) =>
      and(
        eq(table.guildId, guildId),
        eq(table.userId, userId),
        gt(table.createdAt, dayThreshold),
      ),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  logger.debug(
    { guildId, userId, usageCount24h: rows.length },
    'Roast usage in 24h window fetched',
  );

  if (rows.length >= maxRoastsPerDay) {
    // When daily limit is reached, calculate when the oldest usage expires (24h later)
    // rows are ordered by createdAt DESC, so the oldest is at the end
    const oldestUsage = rows.at(-1);
    if (!oldestUsage) {
      logger.error(
        'Unexpected: rows.length >= maxRoastsPerDay but no oldest usage found',
      );
      return null;
    }

    const nextAllowedTimestamp = time(
      timeUntilNextUse(oldestUsage.createdAt, rows.length, maxRoastsPerDay),
      TimestampStyles.RelativeTime,
    );

    return {
      content: `Tu as déjà roast ${String(
        maxRoastsPerDay,
      )} fois aujourd'hui. On va calmer le jeu. Tu pourras roast à nouveau ${nextAllowedTimestamp}`,
      flags: MessageFlags.Ephemeral,
    };
  }

  return null;
}

export async function recordRoastUsage(
  guildId: string,
  userId: string,
): Promise<void> {
  await db.insert(roastUsage).values({
    guildId,
    userId,
  });
}
