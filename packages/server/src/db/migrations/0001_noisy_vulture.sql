CREATE TABLE "sign_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"reminder_cadence_days" integer DEFAULT 3 NOT NULL,
	"signature_expiry_days" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenant_format_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"default_currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_settings" ADD COLUMN "week_start_day" varchar(10) DEFAULT 'monday' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_settings" ADD COLUMN "default_project_visibility" varchar(10) DEFAULT 'team' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_settings" ADD COLUMN "default_billable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sign_settings" ADD CONSTRAINT "sign_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_format_settings" ADD CONSTRAINT "tenant_format_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sign_settings_tenant" ON "sign_settings" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tenant_format_settings_tenant" ON "tenant_format_settings" USING btree ("tenant_id");