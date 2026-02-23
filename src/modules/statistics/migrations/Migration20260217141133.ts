import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260217141133 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "statistic_option_input" ("id" text not null, "composite_option_id" text not null, "input_option_id" text not null, "parameter_name" text not null, "order" integer null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "statistic_option_input_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistic_option_input_composite_option_id" ON "statistic_option_input" ("composite_option_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistic_option_input_input_option_id" ON "statistic_option_input" ("input_option_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistic_option_input_deleted_at" ON "statistic_option_input" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "statistic_option_input" add constraint "statistic_option_input_composite_option_id_foreign" foreign key ("composite_option_id") references "statistics_option" ("id") on update cascade on delete cascade;`);
    this.addSql(`alter table if exists "statistic_option_input" add constraint "statistic_option_input_input_option_id_foreign" foreign key ("input_option_id") references "statistics_option" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "statistics_option" add column if not exists "parameter_config" jsonb null, add column if not exists "preset" boolean not null default false;`);

    this.addSql(`alter table if exists "statistics_alert" drop column if exists "notification_channels";`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "statistic_option_input" cascade;`);

    this.addSql(`alter table if exists "statistics_option" drop column if exists "parameter_config", drop column if exists "preset";`);


    this.addSql(`alter table if exists "statistics_alert" add column if not exists "notification_channels" jsonb not null;`);
  }

}
