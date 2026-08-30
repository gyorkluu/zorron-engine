CREATE TABLE "node_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"tenant_id" uuid,
	"name" varchar(200) NOT NULL,
	"description" text,
	"node_type" varchar(40) NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"category" varchar(40),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "node_assets" ADD CONSTRAINT "node_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "node_assets_owner_id_idx" ON "node_assets" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "node_assets_node_type_idx" ON "node_assets" USING btree ("node_type");--> statement-breakpoint
CREATE INDEX "node_assets_public_idx" ON "node_assets" USING btree ("is_public");