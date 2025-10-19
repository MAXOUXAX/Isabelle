-- Custom SQL migration file, put your code below! --

-- Backfill NULL updated_at values so subsequent migrations can apply NOT NULL constraints safely.

UPDATE `automatic_responses`
SET `updated_at` = COALESCE(`updated_at`, `created_at`, unixepoch())
WHERE `updated_at` IS NULL;
--> statement-breakpoint
UPDATE `guild_configs`
SET `updated_at` = COALESCE(`updated_at`, `created_at`, unixepoch())
WHERE `updated_at` IS NULL;
--> statement-breakpoint
UPDATE `roast_usage`
SET `updated_at` = COALESCE(`updated_at`, `created_at`, unixepoch())
WHERE `updated_at` IS NULL;
--> statement-breakpoint
UPDATE `audit_legal_consent`
SET `updated_at` = COALESCE(`updated_at`, `created_at`, unixepoch())
WHERE `updated_at` IS NULL;