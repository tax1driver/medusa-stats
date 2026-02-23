import { model } from "@medusajs/framework/utils";
import { StatisticsProvider } from "./provider";
import { StatisticsAlert } from "./alert";
import { StatisticsChart } from "./chart";
import { StatisticOptionInput } from "./option-input";

/**
 * Represents a single data point/statistic that can be calculated.
 * Multiple StatisticOptions can be combined in a single Chart for visualization.
 */
export const StatisticsOption = model.define("statistics_option", {
    id: model.id({ prefix: "stat_opt" }).primaryKey(),
    provider_option_name: model.text(),
    local_option_name: model.text(),
    data: model.json(),
    visualization_config: model.json().nullable(),
    cache_options: model.json().nullable(),



    parameter_config: model.json().nullable(),



    preset: model.boolean().default(false),

    provider: model.belongsTo(() => StatisticsProvider, {
        mappedBy: "options"
    }),
    alerts: model.hasMany(() => StatisticsAlert, {
        mappedBy: "option"
    }),



    charts: model.manyToMany(() => StatisticsChart, {
        mappedBy: "statistics",
        pivotTable: "statistics_chart_option"
    }),



    input_dependencies: model.hasMany(() => StatisticOptionInput, {
        mappedBy: "composite_option"
    }),



    dependent_composites: model.hasMany(() => StatisticOptionInput, {
        mappedBy: "input_option"
    }),
}).cascades({
    delete: ["alerts", "input_dependencies", "dependent_composites"]
})