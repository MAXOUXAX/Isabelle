import { GuildConfig } from '@/manager/config.manager.js';
import { sql } from 'drizzle-orm';
import { int, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

const base = () => {
  return {
    createdAt: int('created_at', { mode: 'timestamp' }).default(
      sql`(unixepoch())`,
    ),
    updatedAt: int('updated_at', { mode: 'timestamp' }).$onUpdate(
      () => sql`(unixepoch())`,
    ),
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

export const automaticResponses = sqliteTable('automatic_responses', {
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
});

export const roastUsage = sqliteTable('roast_usage', {
  id: int('id').primaryKey({ autoIncrement: true }),
  guildId: text('guild_id').notNull(),
  userId: text('user_id').notNull(),
  ...base(),
});
