CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`deal_id` text,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`metadata` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`deal_id`) REFERENCES `deals`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`full_name` text NOT NULL,
	`title` text,
	`email` text,
	`email_verified` integer DEFAULT false,
	`phone` text,
	`linkedin_url` text,
	`is_decision_maker` integer DEFAULT false,
	`created_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `deals` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`stage` text DEFAULT 'new_lead' NOT NULL,
	`deal_value` real DEFAULT 0,
	`assigned_rep` text,
	`next_action` text,
	`next_action_date` text,
	`close_date` text,
	`win_loss_reason` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lead_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`total_score` integer DEFAULT 0 NOT NULL,
	`tier` text DEFAULT 'cold' NOT NULL,
	`industry_match` integer DEFAULT 0,
	`employee_fit` integer DEFAULT 0,
	`decision_maker` integer DEFAULT 0,
	`tech_match` integer DEFAULT 0,
	`funding_event` integer DEFAULT 0,
	`traffic_score` integer DEFAULT 0,
	`email_verified_score` integer DEFAULT 0,
	`disqualified` integer DEFAULT false,
	`disqualify_reason` text,
	`scored_at` text NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lead_scores_lead_id_unique` ON `lead_scores` (`lead_id`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`company_name` text NOT NULL,
	`website` text,
	`industry` text,
	`employee_count` integer,
	`revenue_range` text,
	`city` text,
	`state` text,
	`country` text DEFAULT 'US',
	`tech_stack` text,
	`source` text NOT NULL,
	`scrape_job_id` text,
	`confidence_score` integer DEFAULT 0,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scrape_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`params` text,
	`records_found` integer DEFAULT 0,
	`records_new` integer DEFAULT 0,
	`records_duplicate` integer DEFAULT 0,
	`errors` integer DEFAULT 0,
	`started_at` text,
	`completed_at` text,
	`created_at` text NOT NULL
);
