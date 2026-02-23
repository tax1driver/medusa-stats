import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260129125550 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "statistics_provider" ("id" text not null, "is_enabled" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_provider_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_provider_deleted_at" ON "statistics_provider" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "statistics_view" ("id" text not null, "name" text not null, "description" text null, "stats_data" jsonb null, "metadata" jsonb not null default '{}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_view_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_view_deleted_at" ON "statistics_view" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "statistics_snapshot" ("id" text not null, "description" text null, "data" jsonb not null, "view_id" text null, "period_start" timestamptz not null, "period_end" timestamptz not null, "interval" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_snapshot_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_snapshot_view_id" ON "statistics_snapshot" ("view_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_snapshot_deleted_at" ON "statistics_snapshot" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "statistics_option" ("id" text not null, "provider_option_name" text not null, "local_option_name" text not null, "data" jsonb not null, "view_id" text not null, "provider_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_option_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_option_view_id" ON "statistics_option" ("view_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_option_provider_id" ON "statistics_option" ("provider_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_option_deleted_at" ON "statistics_option" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "statistics_alert" ("id" text not null, "name" text not null, "description" text null, "option_id" text not null, "condition" jsonb not null, "severity" text check ("severity" in ('info', 'warning', 'critical')) not null default 'info', "notification_channels" jsonb not null, "is_enabled" boolean not null default true, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_alert_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_alert_option_id" ON "statistics_alert" ("option_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_alert_deleted_at" ON "statistics_alert" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "statistics_alert_log" ("id" text not null, "alert_id" text not null, "triggered_at" timestamptz not null, "current_value" jsonb not null, "comparison_value" jsonb null, "calculated_value" jsonb null, "threshold" jsonb not null, "notification_sent" boolean not null default false, "notification_channels_used" jsonb null, "notification_error" text null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_alert_log_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_alert_log_alert_id" ON "statistics_alert_log" ("alert_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_alert_log_deleted_at" ON "statistics_alert_log" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "statistics_snapshot" add constraint "statistics_snapshot_view_id_foreign" foreign key ("view_id") references "statistics_view" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "statistics_option" add constraint "statistics_option_view_id_foreign" foreign key ("view_id") references "statistics_view" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "statistics_option" add constraint "statistics_option_provider_id_foreign" foreign key ("provider_id") references "statistics_provider" ("id") on update cascade;`);

    this.addSql(`alter table if exists "statistics_alert" add constraint "statistics_alert_option_id_foreign" foreign key ("option_id") references "statistics_option" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "statistics_alert_log" add constraint "statistics_alert_log_alert_id_foreign" foreign key ("alert_id") references "statistics_alert" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "statistics_option" drop constraint if exists "statistics_option_provider_id_foreign";`);

    this.addSql(`alter table if exists "statistics_snapshot" drop constraint if exists "statistics_snapshot_view_id_foreign";`);

    this.addSql(`alter table if exists "statistics_option" drop constraint if exists "statistics_option_view_id_foreign";`);

    this.addSql(`alter table if exists "statistics_alert" drop constraint if exists "statistics_alert_option_id_foreign";`);

    this.addSql(`alter table if exists "statistics_alert_log" drop constraint if exists "statistics_alert_log_alert_id_foreign";`);

    this.addSql(`drop table if exists "statistics_provider" cascade;`);

    this.addSql(`drop table if exists "statistics_view" cascade;`);

    this.addSql(`drop table if exists "statistics_snapshot" cascade;`);

    this.addSql(`drop table if exists "statistics_option" cascade;`);

    this.addSql(`drop table if exists "statistics_alert" cascade;`);

    this.addSql(`drop table if exists "statistics_alert_log" cascade;`);
  }

}
