PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_automatic_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text,
	`configuration` text NOT NULL,
	`probability` integer DEFAULT 100 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_automatic_responses`("id", "guild_id", "configuration", "probability", "created_at", "updated_at") SELECT "id", "guild_id", "configuration", "probability", "created_at", "updated_at" FROM `automatic_responses`;--> statement-breakpoint
DROP TABLE `automatic_responses`;--> statement-breakpoint
ALTER TABLE `__new_automatic_responses` RENAME TO `automatic_responses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_guild_configs` (
	`guild_id` text PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_guild_configs`("guild_id", "config", "created_at", "updated_at") SELECT "guild_id", "config", "created_at", "updated_at" FROM `guild_configs`;--> statement-breakpoint
DROP TABLE `guild_configs`;--> statement-breakpoint
ALTER TABLE `__new_guild_configs` RENAME TO `guild_configs`;