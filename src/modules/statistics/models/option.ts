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
    cache_options: model.json().nullable(), // { enabled: boolean, ttl: number }

    // Composite Statistics: Parameter configuration with values and editability
    // { parameterName: { value: any, locked: boolean } }
    parameter_config: model.json().nullable(),

    // Preset flag for discoverability in library
    // Marks option as reusable template available for cloning
    preset: model.boolean().default(false),

    provider: model.belongsTo(() => StatisticsProvider, {
        mappedBy: "options"
    }),
    alerts: model.hasMany(() => StatisticsAlert, {
        mappedBy: "option"
    }),

    // Many-to-many relationship with charts
    // A StatisticOption can be displayed in multiple charts
    charts: model.manyToMany(() => StatisticsChart, {
        mappedBy: "statistics",
        pivotTable: "statistics_chart_option"
    }),

    // Composite Statistics: Self-referencing relationships via join table
    // Lists all input dependencies (as join records)
    input_dependencies: model.hasMany(() => StatisticOptionInput, {
        mappedBy: "composite_option"
    }),

    // Composite Statistics: Reverse relationship
    // Lists all composites that use this option as input (as join records)
    dependent_composites: model.hasMany(() => StatisticOptionInput, {
        mappedBy: "input_option"
    }),
}).cascades({
    delete: ["alerts", "input_dependencies", "dependent_composites"]
})