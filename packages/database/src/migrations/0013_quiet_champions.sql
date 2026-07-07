CREATE TYPE "public"."llm_provider" AS ENUM('openai', 'anthropic', 'google', 'deepseek', 'ollama', 'openai_compatible');--> statement-breakpoint
CREATE TABLE "user_llm_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "llm_provider" NOT NULL,
	"encrypted_api_key" text,
	"iv" text,
	"key_hint" varchar(8),
	"model" varchar(256) NOT NULL,
	"base_url" varchar(512),
	"is_default" boolean DEFAULT false NOT NULL,
	"last_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_llm_config" ADD CONSTRAINT "user_llm_config_user_id_User_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_llm_config_user_id_idx" ON "user_llm_config" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_llm_config_user_provider_unique" ON "user_llm_config" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "user_llm_config_user_default_unique" ON "user_llm_config" USING btree ("user_id") WHERE "user_llm_config"."is_default" = true;