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

    // Charts (visualizations that can contain multiple statistics)
    charts: model.hasMany(() => StatisticsChart, {
        mappedBy: "view"
    }),

    // Parameter overrides for statistics in this view
    stats_data: model.json().nullable(),

    // Period configuration
    period_type: model.enum(["rolling", "calendar", "custom"]).nullable(),
    period_config: model.json().nullable(), // Structure varies by period_type
    interval: model.number().nullable(), // Time series interval in seconds (e.g., 86400 for daily)

    cache_options: model.json().nullable(), // { enabled: boolean, ttl: number }

    layout_config: model.json().default({
        preset: "compact"
    }),

    metadata: model.json().default({})
}).cascades({
    delete: ["charts"]
});

export { StatisticsView };
