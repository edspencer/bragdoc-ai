CREATE TABLE "PerformanceReview" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"instructions" text,
	"document_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_document_id_Document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."Document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "performance_review_user_id_idx" ON "PerformanceReview" USING btree ("user_id");