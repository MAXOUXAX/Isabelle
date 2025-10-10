import { GuildConfig } from '@/manager/config.manager.js';
import { sql } from 'drizzle-orm';
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const base = () => {
  return {
    createdAt: int('created_at', { mode: 'timestamp' }).default(
      sql`(current_timestamp)`,
    ),
    updatedAt: int('updated_at', { mode: 'timestamp' }).$onUpdate(
      () => sql`(current_timestamp)`,
    ),
  };
};

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

export const guildConfigs = sqliteTable('guild_configs', {
  id: text('guild_id').primaryKey().notNull(),
  config: text('config', { mode: 'json' }).$type<GuildConfig>().notNull(),
  ...base(),
});

export const roastUsage = sqliteTable('roast_usage', {
  id: int('id').primaryKey({ autoIncrement: true }),
  guildId: text('guild_id').notNull(),
  userId: text('user_id').notNull(),
  ...base(),
});
