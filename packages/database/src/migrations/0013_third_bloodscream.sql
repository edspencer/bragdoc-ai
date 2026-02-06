CREATE TYPE "public"."feature_type" AS ENUM('document_generation', 'workstream_clustering', 'chat_tool_call', 'chat_message');--> statement-breakpoint
CREATE TYPE "public"."operation_type" AS ENUM('deduct', 'refund', 'grant');--> statement-breakpoint
CREATE TABLE "CreditTransaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"operation" "operation_type" NOT NULL,
	"feature_type" "feature_type" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_tx_user_id_idx" ON "CreditTransaction" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_tx_created_at_idx" ON "CreditTransaction" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_tx_user_created_at_idx" ON "CreditTransaction" USING btree ("user_id","created_at");