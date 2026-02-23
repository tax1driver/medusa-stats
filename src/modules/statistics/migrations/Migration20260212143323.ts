import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260212143323 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "statistics_view" add column if not exists "cache_options" jsonb null;`);

    this.addSql(`alter table if exists "statistics_option" add column if not exists "cache_options" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "statistics_view" drop column if exists "cache_options";`);

    this.addSql(`alter table if exists "statistics_option" drop column if exists "cache_options";`);
  }

}
