import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260212143000 extends Migration {

  override async up(): Promise<void> {

    this.addSql(`
      create table if not exists "statistics_chart" (
        "id" text not null,
        "name" text not null,
        "description" text null,
        "visualization_config" jsonb null,
        "layout" jsonb null,
        "view_id" text not null,
        "metadata" jsonb not null default '{}',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "statistics_chart_pkey" primary key ("id")
      );
    `);


    this.addSql(`
      create table if not exists "statistics_chart_option" (
        "id" text not null,
        "statistics_chart_id" text not null,
        "statistics_option_id" text not null,
        "order" integer not null default 0,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "statistics_chart_option_pkey" primary key ("id")
      );
    `);


    this.addSql(`
      alter table "statistics_chart" 
      add constraint "statistics_chart_view_id_foreign" 
      foreign key ("view_id") 
      references "statistics_view" ("id") 
      on update cascade on delete cascade;
    `);

    this.addSql(`
      alter table "statistics_chart_option" 
      add constraint "statistics_chart_option_chart_id_foreign" 
      foreign key ("statistics_chart_id") 
      references "statistics_chart" ("id") 
      on update cascade on delete cascade;
    `);

    this.addSql(`
      alter table "statistics_chart_option" 
      add constraint "statistics_chart_option_option_id_foreign" 
      foreign key ("statistics_option_id") 
      references "statistics_option" ("id") 
      on update cascade on delete cascade;
    `);


    this.addSql(`create index if not exists "statistics_chart_view_id_index" on "statistics_chart" ("view_id");`);
    this.addSql(`create index if not exists "statistics_chart_option_chart_id_index" on "statistics_chart_option" ("statistics_chart_id");`);
    this.addSql(`create index if not exists "statistics_chart_option_option_id_index" on "statistics_chart_option" ("statistics_option_id");`);



    this.addSql(`alter table if exists "statistics_option" rename column "visualization_config" to "visualization_config";`);
  }

  override async down(): Promise<void> {

    this.addSql(`alter table if exists "statistics_chart" drop constraint if exists "statistics_chart_view_id_foreign";`);
    this.addSql(`alter table if exists "statistics_chart_option" drop constraint if exists "statistics_chart_option_chart_id_foreign";`);
    this.addSql(`alter table if exists "statistics_chart_option" drop constraint if exists "statistics_chart_option_option_id_foreign";`);


    this.addSql(`drop table if exists "statistics_chart_option" cascade;`);
    this.addSql(`drop table if exists "statistics_chart" cascade;`);


    this.addSql(`alter table if exists "statistics_option" rename column "visualization_config" to "visualization_config";`);
  }

}
