import { model } from "@medusajs/framework/utils";
import { StatisticsChart } from "./chart";

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
    is_private: model.boolean().default(false),
    layout_config: model.json().default({
        preset: "compact"
    }),

    metadata: model.json().default({})
}).cascades({
    delete: ["charts"]
});

export { StatisticsView };
