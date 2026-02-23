import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260223131741 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "statistics_provider" ("id" text not null, "display_name" text not null, "is_enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_provider_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_provider_deleted_at" ON "statistics_provider" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "statistics_option" ("id" text not null, "provider_option_name" text not null, "local_option_name" text not null, "data" jsonb not null, "visualization_config" jsonb null, "cache_options" jsonb null, "parameter_config" jsonb null, "preset" boolean not null default false, "provider_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_option_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_option_provider_id" ON "statistics_option" ("provider_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_option_deleted_at" ON "statistics_option" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "statistics_alert" ("id" text not null, "name" text not null, "description" text null, "option_id" text not null, "condition" jsonb not null, "period" jsonb null, "interval" integer not null default 86400, "severity" text check ("severity" in ('info', 'warning', 'critical')) not null default 'info', "is_enabled" boolean not null default true, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_alert_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_alert_option_id" ON "statistics_alert" ("option_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_alert_deleted_at" ON "statistics_alert" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "statistics_alert_log" ("id" text not null, "alert_id" text not null, "triggered_at" timestamptz not null, "evaluation_data" jsonb not null, "evaluation_hash" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_alert_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_alert_log_alert_id" ON "statistics_alert_log" ("alert_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_alert_log_deleted_at" ON "statistics_alert_log" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "statistic_option_input" ("id" text not null, "composite_option_id" text not null, "input_option_id" text not null, "parameter_name" text null, "order" integer null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistic_option_input_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistic_option_input_composite_option_id" ON "statistic_option_input" ("composite_option_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistic_option_input_input_option_id" ON "statistic_option_input" ("input_option_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistic_option_input_deleted_at" ON "statistic_option_input" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "statistics_view" ("id" text not null, "name" text not null, "description" text null, "stats_data" jsonb null, "period_type" text check ("period_type" in ('rolling', 'calendar', 'custom')) null, "period_config" jsonb null, "interval" integer null, "cache_options" jsonb null, "layout_config" jsonb not null default '{"preset":"compact"}', "metadata" jsonb not null default '{}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_view_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_view_deleted_at" ON "statistics_view" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "statistics_chart" ("id" text not null, "name" text not null, "description" text null, "visualization_config" jsonb null, "layout" jsonb null, "view_id" text not null, "metadata" jsonb not null default '{}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_chart_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_chart_view_id" ON "statistics_chart" ("view_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_chart_deleted_at" ON "statistics_chart" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "statistics_chart_option" ("statistics_option_id" text not null, "statistics_chart_id" text not null, constraint "statistics_chart_option_pkey" primary key ("statistics_option_id", "statistics_chart_id"));`);

    this.addSql(`alter table if exists "statistics_option" add constraint "statistics_option_provider_id_foreign" foreign key ("provider_id") references "statistics_provider" ("id") on update cascade;`);

    this.addSql(`alter table if exists "statistics_alert" add constraint "statistics_alert_option_id_foreign" foreign key ("option_id") references "statistics_option" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "statistics_alert_log" add constraint "statistics_alert_log_alert_id_foreign" foreign key ("alert_id") references "statistics_alert" ("id") on update cascade;`);

    this.addSql(`alter table if exists "statistic_option_input" add constraint "statistic_option_input_composite_option_id_foreign" foreign key ("composite_option_id") references "statistics_option" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "statistic_option_input" add constraint "statistic_option_input_input_option_id_foreign" foreign key ("input_option_id") references "statistics_option" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "statistics_chart" add constraint "statistics_chart_view_id_foreign" foreign key ("view_id") references "statistics_view" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "statistics_chart_option" add constraint "statistics_chart_option_statistics_option_id_foreign" foreign key ("statistics_option_id") references "statistics_option" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "statistics_chart_option" add constraint "statistics_chart_option_statistics_chart_id_foreign" foreign key ("statistics_chart_id") references "statistics_chart" ("id") on update cascade on delete cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "statistics_option" drop constraint if exists "statistics_option_provider_id_foreign";`);

    this.addSql(`alter table if exists "statistics_alert" drop constraint if exists "statistics_alert_option_id_foreign";`);

    this.addSql(`alter table if exists "statistic_option_input" drop constraint if exists "statistic_option_input_composite_option_id_foreign";`);

    this.addSql(`alter table if exists "statistic_option_input" drop constraint if exists "statistic_option_input_input_option_id_foreign";`);

    this.addSql(`alter table if exists "statistics_chart_option" drop constraint if exists "statistics_chart_option_statistics_option_id_foreign";`);

    this.addSql(`alter table if exists "statistics_alert_log" drop constraint if exists "statistics_alert_log_alert_id_foreign";`);

    this.addSql(`alter table if exists "statistics_chart" drop constraint if exists "statistics_chart_view_id_foreign";`);

    this.addSql(`alter table if exists "statistics_chart_option" drop constraint if exists "statistics_chart_option_statistics_chart_id_foreign";`);

    this.addSql(`drop table if exists "statistics_provider" cascade;`);

    this.addSql(`drop table if exists "statistics_option" cascade;`);

    this.addSql(`drop table if exists "statistics_alert" cascade;`);

    this.addSql(`drop table if exists "statistics_alert_log" cascade;`);

    this.addSql(`drop table if exists "statistic_option_input" cascade;`);

    this.addSql(`drop table if exists "statistics_view" cascade;`);

    this.addSql(`drop table if exists "statistics_chart" cascade;`);

    this.addSql(`drop table if exists "statistics_chart_option" cascade;`);
  }

}
