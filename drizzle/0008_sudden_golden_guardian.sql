PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_audit_legal_consent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`scope` text NOT NULL,
	`consented` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_audit_legal_consent`("id", "user_id", "scope", "consented", "created_at", "updated_at") SELECT "id", "user_id", "scope", "consented", "created_at", "updated_at" FROM `audit_legal_consent`;--> statement-breakpoint
DROP TABLE `audit_legal_consent`;--> statement-breakpoint
ALTER TABLE `__new_audit_legal_consent` RENAME TO `audit_legal_consent`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `audit_legal_consent_user_id_scope_created_at_unique` ON `audit_legal_consent` (`user_id`,`scope`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_automatic_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text,
	`configuration` text NOT NULL,
	`probability` integer DEFAULT 100 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_automatic_responses`("id", "guild_id", "configuration", "probability", "created_at", "updated_at") SELECT "id", "guild_id", "configuration", "probability", "created_at", "updated_at" FROM `automatic_responses`;--> statement-breakpoint
DROP TABLE `automatic_responses`;--> statement-breakpoint
ALTER TABLE `__new_automatic_responses` RENAME TO `automatic_responses`;--> statement-breakpoint
CREATE TABLE `__new_guild_configs` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_guild_configs`("guild_id", "config", "created_at", "updated_at") SELECT "guild_id", "config", "created_at", "updated_at" FROM `guild_configs`;--> statement-breakpoint
DROP TABLE `guild_configs`;--> statement-breakpoint
ALTER TABLE `__new_guild_configs` RENAME TO `guild_configs`;--> statement-breakpoint
CREATE TABLE `__new_roast_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_roast_usage`("id", "guild_id", "user_id", "created_at", "updated_at") SELECT "id", "guild_id", "user_id", "created_at", "updated_at" FROM `roast_usage`;--> statement-breakpoint
DROP TABLE `roast_usage`;--> statement-breakpoint
ALTER TABLE `__new_roast_usage` RENAME TO `roast_usage`;--> statement-breakpoint
CREATE TABLE `__new_russian_roulette_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`plays` integer DEFAULT 0 NOT NULL,
	`shots` integer DEFAULT 0 NOT NULL,
	`deaths` integer DEFAULT 0 NOT NULL,
	`timeout_minutes` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_russian_roulette_stats`("id", "guild_id", "user_id", "plays", "shots", "deaths", "timeout_minutes", "created_at", "updated_at") SELECT "id", "guild_id", "user_id", "plays", "shots", "deaths", "timeout_minutes", "created_at", "updated_at" FROM `russian_roulette_stats`;--> statement-breakpoint
DROP TABLE `russian_roulette_stats`;--> statement-breakpoint
ALTER TABLE `__new_russian_roulette_stats` RENAME TO `russian_roulette_stats`;--> statement-breakpoint
CREATE UNIQUE INDEX `russian_roulette_stats_guild_id_user_id_unique` ON `russian_roulette_stats` (`guild_id`,`user_id`);