import { GuildConfig } from '@/manager/config.manager.js';
import { sql } from 'drizzle-orm';
import { int, sqliteTable, text, unique, index } from 'drizzle-orm/sqlite-core';

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
