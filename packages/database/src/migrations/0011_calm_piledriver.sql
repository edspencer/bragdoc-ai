ALTER TABLE "Session" ADD COLUMN "impersonated_by" uuid;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "demo_user_id" uuid;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_impersonated_by_User_id_fk" FOREIGN KEY ("impersonated_by") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_demo_user_id_User_id_fk" FOREIGN KEY ("demo_user_id") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE no action;