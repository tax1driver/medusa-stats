import { model } from "@medusajs/framework/utils";
import { StatisticsOption } from "./option";

/**
 * Join table model for self-referencing relationships between StatisticsOptions.
 * Enables composite statistics to depend on other statistics as inputs.
 * This is a traditional join table (not a pivot) to ensure MikroORM compatibility.
 * 
 * Example:
 * - Composite: "7-Day Moving Average of Order Count"
 *   - Input 1: "Order Count" statistic (parameter_name: "input_statistic")
 */
export const StatisticOptionInput = model.define("statistic_option_input", {
    id: model.id({ prefix: "stat_inp" }).primaryKey(),

    // The composite option that consumes the input
    composite_option: model.belongsTo(() => StatisticsOption, {
        mappedBy: "input_dependencies"
    }),

    // The input option being consumed
    input_option: model.belongsTo(() => StatisticsOption, {
        mappedBy: "dependent_composites"
    }),

    // The parameter name in the composite statistic provider that receives this input
    // Example: "input_statistic", "baseline", "comparison_metric"
    // Nullable: null if dependency is defined but not yet mapped to a parameter
    parameter_name: model.text().nullable(),

    // Optional: Order/priority for multiple inputs (future use)
    order: model.number().nullable(),

    // Optional: Additional metadata for the relationship (future use)
    metadata: model.json().nullable(),
});
