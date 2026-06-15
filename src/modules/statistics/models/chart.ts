import { model } from "@medusajs/framework/utils";
import { StatisticsView } from "./view";
import { StatisticsOption } from "./option";

export const StatisticsChart = model.define("statistics_chart", {
    id: model.id({ prefix: "stat_chart" }).primaryKey(),
    name: model.text(),
    description: model.text().nullable(),
    visualization_config: model.json().nullable(),
    layout: model.json().nullable(),
    view: model.belongsTo(() => StatisticsView, {
        mappedBy: "charts"
    }),
    statistics: model.manyToMany(() => StatisticsOption, {
        mappedBy: "charts",
    }),
    metadata: model.json().default({})
});
