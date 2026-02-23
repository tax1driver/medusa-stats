import { model } from "@medusajs/framework/utils";
import { StatisticsChart } from "./chart";

/**
 * Represents a collection of statistics and charts with shared global configuration.
 * Views organize related statistics and charts together.
 */
const StatisticsView = model.define("statistics_view", {
    id: model.id({ prefix: "stat_view" }).primaryKey(),
    name: model.text(),
    description: model.text().nullable(),


    charts: model.hasMany(() => StatisticsChart, {
        mappedBy: "view"
    }),


    stats_data: model.json().nullable(),


    period_type: model.enum(["rolling", "calendar", "custom"]).nullable(),
    period_config: model.json().nullable(),
    interval: model.number().nullable(),

    cache_options: model.json().nullable(),

    layout_config: model.json().default({
        preset: "compact"
    }),

    metadata: model.json().default({})
}).cascades({
    delete: ["charts"]
});

export { StatisticsView };
