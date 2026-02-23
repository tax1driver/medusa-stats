import { model } from "@medusajs/framework/utils";
import { StatisticsOption } from "./option";

const StatisticsProvider = model.define("statistics_provider", {
    id: model.text().primaryKey(),
    display_name: model.text(),
    is_enabled: model.boolean().default(true),
    options: model.hasMany(() => StatisticsOption, {
        mappedBy: "provider"
    })
});

export { StatisticsProvider };
