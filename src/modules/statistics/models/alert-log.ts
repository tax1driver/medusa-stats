import { model } from "@medusajs/framework/utils";
import { StatisticsAlert } from "./alert";

export const StatisticsAlertLog = model.define("statistics_alert_log", {
    id: model.id({ prefix: "stat_alert_log" }).primaryKey(),


    alert: model.belongsTo(() => StatisticsAlert, {
        mappedBy: "logs"
    }),


    triggered_at: model.dateTime(),
    evaluation_data: model.json(),
    evaluation_hash: model.text(),


    metadata: model.json().nullable(),
});
