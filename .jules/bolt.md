## 2026-01-30 - Missing Database Indexes
**Learning:** `drizzle-kit` requires manual index definition in schema. Missing indexes on frequently queried fields (like `guildId` or `userId` in log tables) are common and easy performance wins.
**Action:** Always check `schema.ts` for missing indexes on foreign keys and filter columns.

## 2026-02-10 - Expensive Intl.DateTimeFormat Instantiation
**Learning:** `Intl.DateTimeFormat` instantiation inside loops (especially for autocomplete suggestions running on every keystroke) is extremely expensive (measured ~70x slowdown). Hoisting formatters to module scope is a massive win with zero downside.
**Action:** Always check loop bodies for `new Intl.DateTimeFormat` or `.toLocaleString()` calls and hoist them if the locale/options are constant.
