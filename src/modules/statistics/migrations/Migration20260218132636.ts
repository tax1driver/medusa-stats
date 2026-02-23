import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260218132636 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "statistics_option" drop constraint if exists "statistics_option_view_id_foreign";`);

    this.addSql(`drop index if exists "IDX_statistics_option_view_id";`);
    this.addSql(`alter table if exists "statistics_option" drop column if exists "view_id";`);

    this.addSql(`alter table if exists "statistic_option_input" alter column "parameter_name" type text using ("parameter_name"::text);`);
    this.addSql(`alter table if exists "statistic_option_input" alter column "parameter_name" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "statistics_option" add column if not exists "view_id" text not null;`);
    this.addSql(`alter table if exists "statistics_option" add constraint "statistics_option_view_id_foreign" foreign key ("view_id") references "statistics_view" ("id") on update cascade on delete cascade;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_statistics_option_view_id" ON "statistics_option" ("view_id") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "statistic_option_input" alter column "parameter_name" type text using ("parameter_name"::text);`);
    this.addSql(`alter table if exists "statistic_option_input" alter column "parameter_name" set not null;`);
  }

}
