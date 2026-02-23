import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260218173830 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "statistics_view" add column if not exists "layout_config" jsonb not null default '{"preset":"compact"}';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "statistics_view" drop column if exists "layout_config";`);
  }

}
