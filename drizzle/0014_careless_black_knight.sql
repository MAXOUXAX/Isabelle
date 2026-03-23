CREATE TABLE `reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message` text NOT NULL,
	`due_at` integer NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`claimed_at` integer,
	`claimed_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reminders_due_at_id_idx` ON `reminders` (`due_at`,`id`);--> statement-breakpoint
CREATE INDEX `reminders_guild_user_due_at_id_idx` ON `reminders` (`guild_id`,`user_id`,`due_at`,`id`);