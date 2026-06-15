import { model } from "@medusajs/framework/utils";
import { StatisticsOption } from "./option";

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
