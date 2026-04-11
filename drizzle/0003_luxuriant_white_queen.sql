CREATE SCHEMA "notifications";
--> statement-breakpoint
CREATE TABLE "listings"."listing_view" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"viewer_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications"."notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"related_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listings"."listing_view" ADD CONSTRAINT "listing_view_listing_id_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"."listing"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications"."notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "listing_view_listing_id_idx" ON "listings"."listing_view" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "listing_view_viewer_key_idx" ON "listings"."listing_view" USING btree ("listing_id","viewer_key","created_at");