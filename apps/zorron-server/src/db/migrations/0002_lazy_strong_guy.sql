ALTER TABLE "projects" ADD COLUMN "forked_from_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "forked_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "projects_forked_from_id_idx" ON "projects" USING btree ("forked_from_id");