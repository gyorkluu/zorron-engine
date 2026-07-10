CREATE TABLE "scenario_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"variant_key" varchar(20) NOT NULL,
	"label" varchar(100),
	"description" text,
	"weight" integer DEFAULT 1 NOT NULL,
	"is_control" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"variant_id" uuid,
	"session_id" uuid,
	"user_identifier" varchar(200) NOT NULL,
	"event_type" varchar(20) NOT NULL,
	"node_id" varchar(100),
	"event_data" jsonb DEFAULT '{}'::jsonb,
	"tenant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scenario_variants" ADD CONSTRAINT "scenario_variants_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_variant_id_scenario_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."scenario_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_events" ADD CONSTRAINT "session_events_session_id_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."test_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "scenario_variants_project_variant_unique" ON "scenario_variants" USING btree ("project_id","variant_key");--> statement-breakpoint
CREATE INDEX "scenario_variants_project_id_idx" ON "scenario_variants" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "scenario_variants_tenant_id_idx" ON "scenario_variants" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "session_events_project_id_idx" ON "session_events" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "session_events_variant_id_idx" ON "session_events" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "session_events_user_identifier_idx" ON "session_events" USING btree ("user_identifier");--> statement-breakpoint
CREATE INDEX "session_events_tenant_id_idx" ON "session_events" USING btree ("tenant_id");