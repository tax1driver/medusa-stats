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


    composite_option: model.belongsTo(() => StatisticsOption, {
        mappedBy: "input_dependencies"
    }),


    input_option: model.belongsTo(() => StatisticsOption, {
        mappedBy: "dependent_composites"
    }),




    parameter_name: model.text().nullable(),


    order: model.number().nullable(),


    metadata: model.json().nullable(),
});
