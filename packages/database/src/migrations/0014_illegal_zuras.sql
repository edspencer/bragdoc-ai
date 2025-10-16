ALTER TABLE "Achievement" DROP CONSTRAINT "Achievement_company_id_Company_id_fk";
--> statement-breakpoint
ALTER TABLE "Document" DROP CONSTRAINT "Document_company_id_Company_id_fk";
--> statement-breakpoint
ALTER TABLE "Project" DROP CONSTRAINT "Project_company_id_Company_id_fk";
--> statement-breakpoint
ALTER TABLE "Standup" DROP CONSTRAINT "Standup_companyId_Company_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_company_id_Company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."Company"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_company_id_Company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."Company"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Project" ADD CONSTRAINT "Project_company_id_Company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."Company"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Standup" ADD CONSTRAINT "Standup_companyId_Company_id_fk" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
