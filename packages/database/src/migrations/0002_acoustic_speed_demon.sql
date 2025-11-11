CREATE TABLE "Workstream" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#3B82F6',
	"centroid_embedding" vector(1536),
	"centroid_updated_at" timestamp,
	"achievement_count" integer DEFAULT 0,
	"is_archived" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WorkstreamMetadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"last_full_clustering_at" timestamp NOT NULL,
	"achievement_count_at_last_clustering" integer NOT NULL,
	"epsilon" real NOT NULL,
	"min_pts" integer NOT NULL,
	"workstream_count" integer DEFAULT 0,
	"outlier_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "WorkstreamMetadata_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "Achievement" ADD COLUMN "workstream_id" uuid;--> statement-breakpoint
ALTER TABLE "Achievement" ADD COLUMN "workstream_source" varchar(16);--> statement-breakpoint
ALTER TABLE "Achievement" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "Achievement" ADD COLUMN "embedding_model" varchar(64) DEFAULT 'text-embedding-3-small';--> statement-breakpoint
ALTER TABLE "Achievement" ADD COLUMN "embedding_generated_at" timestamp;--> statement-breakpoint
ALTER TABLE "Workstream" ADD CONSTRAINT "Workstream_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "WorkstreamMetadata" ADD CONSTRAINT "WorkstreamMetadata_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_workstream_id_Workstream_id_fk" FOREIGN KEY ("workstream_id") REFERENCES "public"."Workstream"("id") ON DELETE set null ON UPDATE no action;