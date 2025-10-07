CREATE TABLE IF NOT EXISTS "Standup" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"userId" uuid NOT NULL,
	"companyId" uuid,
	"project_ids" uuid[],
	"description" text,
	"instructions" text,
	"days_mask" smallint NOT NULL,
	"meeting_time" time NOT NULL,
	"timezone" varchar(64) NOT NULL,
	"start_date" date DEFAULT now() NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "StandupDocument" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"standupId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"wip" text,
	"achievements_summary" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Standup" ADD CONSTRAINT "Standup_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Standup" ADD CONSTRAINT "Standup_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StandupDocument" ADD CONSTRAINT "StandupDocument_standupId_Standup_id_fk" FOREIGN KEY ("standupId") REFERENCES "public"."Standup"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "StandupDocument" ADD CONSTRAINT "StandupDocument_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
