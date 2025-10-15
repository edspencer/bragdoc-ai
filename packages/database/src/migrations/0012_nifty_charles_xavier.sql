CREATE TABLE IF NOT EXISTS "Stream" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"chatId" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	CONSTRAINT "Stream_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
ALTER TABLE "Chat" ADD COLUMN "lastContext" jsonb;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "kind" varchar DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE "Document" ADD COLUMN "chat_id" uuid;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "parts" json NOT NULL;--> statement-breakpoint
ALTER TABLE "Message" ADD COLUMN "attachments" json NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_chat_id_Chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "Message" DROP COLUMN IF EXISTS "content";