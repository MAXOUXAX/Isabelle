CREATE TABLE `reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`guild_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`message` text NOT NULL,
	`due_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reminders_due_at_idx` ON `reminders` (`due_at`);