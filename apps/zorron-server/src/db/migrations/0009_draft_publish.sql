ALTER TABLE "projects" ADD COLUMN "published_data" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "published_at" timestamp with time zone;