CREATE TABLE `russian_roulette_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`shots_fired` integer DEFAULT 0 NOT NULL,
	`deaths` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (current_timestamp),
	`updated_at` integer
);
