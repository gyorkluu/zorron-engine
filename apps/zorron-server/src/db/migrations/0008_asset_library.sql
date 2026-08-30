ALTER TABLE "assets" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "folder" varchar(255);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "scope" varchar(10) DEFAULT 'project' NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "usage_count" integer DEFAULT 0 NOT NULL;