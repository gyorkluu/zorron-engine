CREATE TABLE "save_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"slot_index" integer NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"chapter_title" varchar(200),
	"preview_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "save_slots" ADD CONSTRAINT "save_slots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "save_slots" ADD CONSTRAINT "save_slots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "save_slots_user_project_slot_idx" ON "save_slots" USING btree ("user_id","project_id","slot_index");--> statement-breakpoint
CREATE INDEX "save_slots_project_idx" ON "save_slots" USING btree ("project_id");