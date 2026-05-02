CREATE TABLE "clicks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"link_id" integer NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"referrer_host" text,
	"device" text NOT NULL,
	"browser" text NOT NULL,
	"country" char(2)
);
--> statement-breakpoint
CREATE TABLE "links" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(32) NOT NULL,
	"target_url" text NOT NULL,
	"title" text,
	"mgmt_token_hash" char(64) NOT NULL,
	"creator_ip_hash" char(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"max_clicks" integer,
	"disabled" boolean DEFAULT false NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "links_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "clicks" ADD CONSTRAINT "clicks_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clicks_link_ts_idx" ON "clicks" USING btree ("link_id","ts");--> statement-breakpoint
CREATE INDEX "links_mgmt_token_hash_idx" ON "links" USING btree ("mgmt_token_hash");--> statement-breakpoint
CREATE INDEX "links_creator_created_idx" ON "links" USING btree ("creator_ip_hash","created_at");