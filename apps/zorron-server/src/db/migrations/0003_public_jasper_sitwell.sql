CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "test_sessions" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tenant_id" uuid;--> statement-breakpoint
CREATE INDEX "projects_tenant_id_idx" ON "projects" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "test_sessions_tenant_id_idx" ON "test_sessions" USING btree ("tenant_id");