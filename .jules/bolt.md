## 2026-01-30 - Missing Database Indexes
**Learning:** `drizzle-kit` requires manual index definition in schema. Missing indexes on frequently queried fields (like `guildId` or `userId` in log tables) are common and easy performance wins.
**Action:** Always check `schema.ts` for missing indexes on foreign keys and filter columns.

## 2026-02-07 - Expensive Intl Instantiation in Autocomplete
**Learning:** `Intl.DateTimeFormat` instantiation is expensive (~30ms for 90 calls). Using it inside a loop in an autocomplete handler (which fires on every keystroke) causes noticeable lag.
**Action:** Always hoist `Intl` formatters to module scope or reuse them.
