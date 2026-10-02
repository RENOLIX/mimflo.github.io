CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`word` text NOT NULL,
	`definition` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`level` text NOT NULL,
	`exam` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer NOT NULL,
	`trial_at` integer,
	`selected_plan` text
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`article_id` text NOT NULL,
	`seconds` integer NOT NULL,
	`transcript` text NOT NULL,
	`coverage` integer,
	`created_at` integer NOT NULL
);
