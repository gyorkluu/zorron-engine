CREATE TABLE "test_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_identifier" varchar(200) NOT NULL,
	"settlement_result" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "test_sessions" ADD CONSTRAINT "test_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "test_sessions_project_id_idx" ON "test_sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "test_sessions_user_identifier_idx" ON "test_sessions" USING btree ("user_identifier");