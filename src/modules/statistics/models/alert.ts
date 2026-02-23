import { model } from "@medusajs/framework/utils";
import { StatisticsOption } from "./option";
import { StatisticsAlertLog } from "./alert-log";

export const StatisticsAlert = model.define("statistics_alert", {
    id: model.id({ prefix: "stat_alert" }).primaryKey(),
    name: model.text(),
    description: model.text().nullable(),

    // Relationship to the statistic being monitored
    option: model.belongsTo(() => StatisticsOption, {
        mappedBy: "alerts"
    }),

    // Alert condition configuration
    // { operator: 'lt'|'gt'|'lte'|'gte'|'eq'|'neq'|'between', comparisonType: 'absolute'|'relative',
    //   threshold: number|[number,number], lookbackPositions?: number, changeType?: 'absolute'|'percentage' }
    condition: model.json(),

    // Period configuration (optional - auto-calculated for relative comparisons without explicit period)
    // { type: 'calendar'|'custom', config: { reference } | { start, end } }
    period: model.json().nullable(),

    // Interval configuration (granularity of data aggregation in seconds)
    interval: model.number().default(86400), // Default: 1 day (86400 seconds)

    // Alert metadata
    severity: model.enum(["info", "warning", "critical"]).default("info"),
    is_enabled: model.boolean().default(true),
    metadata: model.json().nullable(), // { cooldown_period, max_alerts_per_day, custom_message, recipients }

    // Alert logs
    logs: model.hasMany(() => StatisticsAlertLog, {
        mappedBy: "alert"
    }),
});
