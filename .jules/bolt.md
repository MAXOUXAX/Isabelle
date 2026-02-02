## 2026-01-30 - Missing Database Indexes
**Learning:** `drizzle-kit` requires manual index definition in schema. Missing indexes on frequently queried fields (like `guildId` or `userId` in log tables) are common and easy performance wins.
**Action:** Always check `schema.ts` for missing indexes on foreign keys and filter columns.

## 2026-02-17 - Leaderboard Pagination
**Learning:** Fetching all rows for leaderboards and sorting in application memory is a significant bottleneck. Drizzle queries should use `.limit()` and composite indexes for top-N queries.
**Action:** Identify leaderboard-style queries and ensure they use `orderBy` + `limit` with backing indexes.
