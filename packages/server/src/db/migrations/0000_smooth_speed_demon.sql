CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`picture_url` text,
	`provider` text DEFAULT 'google' NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`tokenExpiresAt` text NOT NULL,
	`history_id` integer,
	`lastFullSync` text,
	`lastSync` text,
	`sync_status` text DEFAULT 'idle' NOT NULL,
	`sync_error` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);--> statement-breakpoint
CREATE INDEX `idx_accounts_provider` ON `accounts` (`provider`,`provider_id`);--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`email_id` text NOT NULL,
	`gmail_attachment_id` text,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`content_id` text,
	`is_inline` integer DEFAULT false NOT NULL,
	`storage_url` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`email_id`) REFERENCES `emails`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_attachments_email` ON `attachments` (`email_id`);--> statement-breakpoint
CREATE TABLE `category_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`conditions` text NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_category_rules_account` ON `category_rules` (`account_id`,`priority`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`frequency` integer DEFAULT 1 NOT NULL,
	`lastContacted` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_contacts_account_email` ON `contacts` (`account_id`,`email`);--> statement-breakpoint
CREATE INDEX `idx_contacts_account_freq` ON `contacts` (`account_id`,`frequency`);--> statement-breakpoint
CREATE TABLE `email_tracking` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`email_id` text,
	`thread_id` text,
	`tracking_id` text NOT NULL,
	`subject` text,
	`recipient_address` text NOT NULL,
	`open_count` integer DEFAULT 0 NOT NULL,
	`click_count` integer DEFAULT 0 NOT NULL,
	`firstOpenedAt` text,
	`lastOpenedAt` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`email_id`) REFERENCES `emails`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_tracking_tracking_id_unique` ON `email_tracking` (`tracking_id`);--> statement-breakpoint
CREATE INDEX `idx_email_tracking_account` ON `email_tracking` (`account_id`);--> statement-breakpoint
CREATE INDEX `idx_email_tracking_thread` ON `email_tracking` (`thread_id`);--> statement-breakpoint
CREATE TABLE `emails` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`thread_id` text NOT NULL,
	`gmail_message_id` text NOT NULL,
	`message_id_header` text,
	`in_reply_to` text,
	`references_header` text,
	`from_address` text NOT NULL,
	`from_name` text,
	`to_addresses` text DEFAULT '[]' NOT NULL,
	`cc_addresses` text DEFAULT '[]' NOT NULL,
	`bcc_addresses` text DEFAULT '[]' NOT NULL,
	`reply_to` text,
	`subject` text,
	`snippet` text,
	`body_text` text,
	`body_html` text,
	`gmail_labels` text DEFAULT '[]' NOT NULL,
	`is_unread` integer DEFAULT true NOT NULL,
	`is_starred` integer DEFAULT false NOT NULL,
	`is_draft` integer DEFAULT false NOT NULL,
	`internalDate` text NOT NULL,
	`receivedAt` text,
	`size_estimate` integer,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_emails_account_gmail` ON `emails` (`account_id`,`gmail_message_id`);--> statement-breakpoint
CREATE INDEX `idx_emails_thread` ON `emails` (`thread_id`,`internalDate`);--> statement-breakpoint
CREATE INDEX `idx_emails_account_date` ON `emails` (`account_id`,`internalDate`);--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`gmail_thread_id` text NOT NULL,
	`subject` text,
	`snippet` text,
	`message_count` integer DEFAULT 0 NOT NULL,
	`unread_count` integer DEFAULT 0 NOT NULL,
	`has_attachments` integer DEFAULT false NOT NULL,
	`lastMessageAt` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`labels` text DEFAULT '[]' NOT NULL,
	`is_starred` integer DEFAULT false NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`is_trashed` integer DEFAULT false NOT NULL,
	`is_spam` integer DEFAULT false NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_threads_account_gmail` ON `threads` (`account_id`,`gmail_thread_id`);--> statement-breakpoint
CREATE INDEX `idx_threads_account_category` ON `threads` (`account_id`,`category`);--> statement-breakpoint
CREATE INDEX `idx_threads_last_message` ON `threads` (`account_id`,`lastMessageAt`);--> statement-breakpoint
CREATE TABLE `tracking_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tracking_id` text NOT NULL,
	`event_type` text NOT NULL,
	`link_url` text,
	`ip_address` text,
	`user_agent` text,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tracking_events_tracking_id` ON `tracking_events` (`tracking_id`);--> statement-breakpoint
CREATE INDEX `idx_tracking_events_created_at` ON `tracking_events` (`createdAt`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`density` text DEFAULT 'default' NOT NULL,
	`shortcuts_preset` text DEFAULT 'superhuman' NOT NULL,
	`custom_shortcuts` text DEFAULT '{}' NOT NULL,
	`auto_advance` text DEFAULT 'next' NOT NULL,
	`reading_pane` text DEFAULT 'right' NOT NULL,
	`desktop_notifications` integer DEFAULT true NOT NULL,
	`notification_sound` integer DEFAULT false NOT NULL,
	`signature_html` text,
	`tracking_enabled` integer DEFAULT false NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_account_id_unique` ON `user_settings` (`account_id`);