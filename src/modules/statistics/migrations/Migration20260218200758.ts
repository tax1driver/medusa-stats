import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260218200758 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "statistics_alert_log" drop column if exists "current_value", drop column if exists "comparison_value", drop column if exists "calculated_value", drop column if exists "threshold";`);

    this.addSql(`alter table if exists "statistics_alert_log" add column if not exists "evaluation_data" jsonb not null, add column if not exists "evaluation_hash" text not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "statistics_alert_log" drop column if exists "evaluation_hash";`);

    this.addSql(`alter table if exists "statistics_alert_log" add column if not exists "comparison_value" jsonb null, add column if not exists "calculated_value" jsonb null, add column if not exists "threshold" jsonb not null;`);
    this.addSql(`alter table if exists "statistics_alert_log" rename column "evaluation_data" to "current_value";`);
  }

}
