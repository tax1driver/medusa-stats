import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260701120242 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "statistics_alert_log" drop constraint if exists "statistics_alert_log_alert_id_foreign";`);

    this.addSql(`alter table if exists "statistics_alert_log" add constraint "statistics_alert_log_alert_id_foreign" foreign key ("alert_id") references "statistics_alert" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "statistics_view" add column if not exists "is_private" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "statistics_alert_log" drop constraint if exists "statistics_alert_log_alert_id_foreign";`);

    this.addSql(`alter table if exists "statistics_alert_log" add constraint "statistics_alert_log_alert_id_foreign" foreign key ("alert_id") references "statistics_alert" ("id") on update cascade;`);

    this.addSql(`alter table if exists "statistics_view" drop column if exists "is_private";`);
  }

}
