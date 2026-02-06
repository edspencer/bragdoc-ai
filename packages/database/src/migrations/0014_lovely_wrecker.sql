CREATE TABLE "StripeEvent" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"type" varchar(64) NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL
);
