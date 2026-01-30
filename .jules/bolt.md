## 2026-01-30 - Missing Database Indexes
**Learning:** `drizzle-kit` requires manual index definition in schema. Missing indexes on frequently queried fields (like `guildId` or `userId` in log tables) are common and easy performance wins.
**Action:** Always check `schema.ts` for missing indexes on foreign keys and filter columns.
