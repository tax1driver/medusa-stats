import { model } from "@medusajs/framework/utils";
import { StatisticsOption } from "./option";
import { StatisticsAlertLog } from "./alert-log";

export const StatisticsAlert = model.define("statistics_alert", {
    id: model.id({ prefix: "stat_alert" }).primaryKey(),
    name: model.text(),
    description: model.text().nullable(),


    option: model.belongsTo(() => StatisticsOption, {
        mappedBy: "alerts"
    }),




    condition: model.json(),



    period: model.json().nullable(),


    interval: model.number().default(86400),


    severity: model.enum(["info", "warning", "critical"]).default("info"),
    is_enabled: model.boolean().default(true),
    metadata: model.json().nullable(),


    logs: model.hasMany(() => StatisticsAlertLog, {
        mappedBy: "alert"
    }),
});
