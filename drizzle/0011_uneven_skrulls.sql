CREATE TABLE `agenda_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`title` text NOT NULL,
	`emoji` text NOT NULL,
	`description` text NOT NULL,
	`location` text NOT NULL,
	`discord_event_id` text NOT NULL,
	`discord_thread_id` text NOT NULL,
	`event_start_time` integer NOT NULL,
	`event_end_time` integer NOT NULL,
	`thread_closed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `agenda_events_idx` ON `agenda_events` (`guild_id`,`event_start_time`,`event_end_time`);--> statement-breakpoint
CREATE INDEX `agenda_events_thread_close_idx` ON `agenda_events` (`thread_closed`,`event_end_time`);--> statement-breakpoint
CREATE UNIQUE INDEX `agenda_events_guild_id_discord_event_id_unique` ON `agenda_events` (`guild_id`,`discord_event_id`);