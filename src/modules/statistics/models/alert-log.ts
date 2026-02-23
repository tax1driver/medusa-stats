import { model } from "@medusajs/framework/utils";
import { StatisticsAlert } from "./alert";

export const StatisticsAlertLog = model.define("statistics_alert_log", {
    id: model.id({ prefix: "stat_alert_log" }).primaryKey(),

    // Relationship to the alert
    alert: model.belongsTo(() => StatisticsAlert, {
        mappedBy: "logs"
    }),

    // Alert trigger details
    triggered_at: model.dateTime(),
    evaluation_data: model.json(), // any relevant data for analysis (e.g., current value, reference value, operator, etc.)
    evaluation_hash: model.text(), // hash of the evaluation data (or any unique identifier for the evaluation) to prevent duplicates

    // Additional context
    metadata: model.json().nullable(),
});
