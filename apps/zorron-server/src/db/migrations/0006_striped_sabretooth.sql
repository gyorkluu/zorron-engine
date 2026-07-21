CREATE TABLE "jx3_appeals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tuilan_id" varchar(64) NOT NULL,
	"screenshot_path" text NOT NULL,
	"reason" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jx3_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tuilan_id" varchar(64) NOT NULL,
	"person_id" varchar(128),
	"profile" jsonb,
	"variables" jsonb,
	"settlement_result" jsonb,
	"card_image_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jx3_submissions_tuilan_id_unique" UNIQUE("tuilan_id")
);
--> statement-breakpoint
ALTER TABLE "test_sessions" ALTER COLUMN "settlement_result" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "jx3_appeals_tuilan_id_idx" ON "jx3_appeals" USING btree ("tuilan_id");--> statement-breakpoint
CREATE INDEX "jx3_appeals_status_idx" ON "jx3_appeals" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "jx3_submissions_tuilan_id_idx" ON "jx3_submissions" USING btree ("tuilan_id");