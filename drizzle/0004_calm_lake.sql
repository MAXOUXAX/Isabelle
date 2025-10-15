CREATE TABLE `audit_legal_consent` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`scope` text NOT NULL,
	`consented` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_legal_consent_user_id_scope_created_at_unique` ON `audit_legal_consent` (`user_id`,`scope`,`created_at`);--> statement-breakpoint
CREATE TABLE `roast_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guild_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer
);
