import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260130140002 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "statistics_option" add column if not exists "visualization_config" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "statistics_option" drop column if exists "visualization_config";`);
  }

}
