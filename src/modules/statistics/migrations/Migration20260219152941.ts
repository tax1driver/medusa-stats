import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260219152941 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`drop table if exists "statistics_snapshot" cascade;`);

    this.addSql(`alter table if exists "statistics_provider" add column if not exists "display_name" text not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`create table if not exists "statistics_snapshot" ("id" text not null, "description" text null, "data" jsonb not null, "view_id" text null, "period_start" timestamptz not null, "period_end" timestamptz not null, "interval" integer not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistics_snapshot_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_snapshot_view_id" ON "statistics_snapshot" ("view_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_snapshot_deleted_at" ON "statistics_snapshot" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "statistics_snapshot" add constraint "statistics_snapshot_view_id_foreign" foreign key ("view_id") references "statistics_view" ("id") on update cascade on delete set null;`);

    this.addSql(`alter table if exists "statistics_provider" drop column if exists "display_name";`);
  }

}
