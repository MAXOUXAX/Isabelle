import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const automaticResponses = sqliteTable('automatic_responses', {
  id: int().primaryKey({ autoIncrement: true }),
  guildId: text().notNull(),
  triggers: text({ mode: 'json' }).$type<{ triggers: string[] }>(),
  responses: text({ mode: 'json' }).$type<{ responses: string[] }>(),
  probability: int().default(100),
  createdAt: int().default(Date.now()),
  updatedAt: int().default(Date.now()),
});
