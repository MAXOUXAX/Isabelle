import { GuildConfig } from '@/manager/config.manager.js';
import { sql } from 'drizzle-orm';
import { index, int, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

const base = () => {
  return {
    createdAt: int('created_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: int('updated_at', { mode: 'timestamp' })
      .default(sql`(unixepoch())`)
      .$onUpdate(() => new Date())
      .notNull(),
  };
};

// This table will store everytime a user has consented or denied a legal scope
// This is why the unicity is on userId + scope + createdAt, to keep a history of their choices for legal audit purposes
export const auditLegalConsent = sqliteTable(
  'audit_legal_consent',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id').notNull(),
    scope: text('scope').notNull(),
    consented: int('consented').notNull(),
    ...base(),
  },
  (t) => [unique().on(t.userId, t.scope, t.createdAt)],
);

export const guildConfigs = sqliteTable('guild_configs', {
  id: text('guild_id').primaryKey().notNull(),
  config: text('config', { mode: 'json' }).$type<GuildConfig>().notNull(),
  ...base(),
});

export const automaticResponses = sqliteTable(
  'automatic_responses',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    guildId: text('guild_id'), // guildId is nullable for global responses
    configuration: text('configuration', { mode: 'json' })
      .$type<{
        triggers: string[];
        responses: string[];
      }>()
      .notNull(),
    probability: int('probability').default(100).notNull(),
    ...base(),
  },
  (t) => [index('automatic_responses_guild_id_idx').on(t.guildId)],
);

export const roastUsage = sqliteTable(
  'roast_usage',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    ...base(),
  },
  (t) => [index('roast_usage_idx').on(t.guildId, t.userId, t.createdAt)],
);

export const russianRouletteStats = sqliteTable(
  'russian_roulette_stats',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    plays: int('plays').default(0).notNull(), // Times the user executed /roulette-russe jouer
    shots: int('shots').default(0).notNull(), // Times the user's play resulted in someone getting hit
    deaths: int('deaths').default(0).notNull(), // Times the user was hit by a shot
    timeoutMinutes: int('timeout_minutes').default(0).notNull(), // Total minutes timed out
    ...base(),
  },
  (t) => [
    unique().on(t.guildId, t.userId),
    index('russian_roulette_stats_guild_timeout_idx').on(
      t.guildId,
      t.timeoutMinutes,
    ),
  ],
);

export const agendaEvents = sqliteTable(
  'agenda_events',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    guildId: text('guild_id').notNull(),
    title: text('title').notNull(),
    emoji: text('emoji').notNull(),
    description: text('description').notNull(),
    location: text('location').notNull(),
    discordEventId: text('discord_event_id').notNull(),
    discordThreadId: text('discord_thread_id').notNull(),
    eventStartTime: int('event_start_time', { mode: 'timestamp' }).notNull(),
    eventEndTime: int('event_end_time', { mode: 'timestamp' }).notNull(),
    threadClosed: int('thread_closed', { mode: 'boolean' })
      .default(false)
      .notNull(),
    ...base(),
  },
  (t) => [
    unique().on(t.guildId, t.discordEventId),
    index('agenda_events_idx').on(t.guildId, t.eventStartTime, t.eventEndTime),
    index('agenda_events_thread_close_idx').on(t.threadClosed, t.eventEndTime),
  ],
);

export const birthdays = sqliteTable(
  'birthdays',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    guildId: text('guild_id').notNull(),
    userId: text('user_id').notNull(),
    day: int('day').notNull(),
    month: int('month').notNull(),
    year: int('year'), // Nullable
    lastCelebratedYear: int('last_celebrated_year').default(0).notNull(),
    ...base(),
  },
  (t) => [
    unique().on(t.guildId, t.userId),
    index('birthdays_date_idx').on(t.guildId, t.month, t.day),
  ],
);
