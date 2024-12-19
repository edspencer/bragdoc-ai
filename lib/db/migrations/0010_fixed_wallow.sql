ALTER TABLE "Company" DROP CONSTRAINT "Company_user_id_User_id_fk";
--> statement-breakpoint
ALTER TABLE "Project" ALTER COLUMN "start_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Project" ADD COLUMN "status" varchar(32) DEFAULT 'active' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Company" ADD CONSTRAINT "Company_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
