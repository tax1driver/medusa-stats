import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260205164529 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "statistics_view" add column if not exists "period_type" text check ("period_type" in ('rolling', 'calendar', 'custom')) null, add column if not exists "period_config" jsonb null, add column if not exists "interval" integer null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "statistics_view" drop column if exists "period_type", drop column if exists "period_config", drop column if exists "interval";`);
  }

}
