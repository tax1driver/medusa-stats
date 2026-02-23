import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { calculateStatisticsWorkflow, evaluateAlertsWorkflow } from "../workflows/statistics";
import { STATISTICS_MODULE } from "../modules/statistics";
import StatisticsService from "../modules/statistics/service";
import { calculateDatesFromPeriod } from "../modules/statistics/utils/period-utils";

function getLastCompletedIntervalBoundary(now: Date, intervalSeconds: number): Date {
    const intervalMs = intervalSeconds * 1000;
    return new Date(Math.floor(now.getTime() / intervalMs) * intervalMs);
}


export default async function evaluateStatisticsAlertsJob(container: MedusaContainer) {
    const logger = container.resolve("logger");
    const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);

    try {
        // Fetch all active alerts with their options
        const alerts = await statisticsService.listStatisticsAlerts(
            { is_enabled: true },
            {
                relations: ["option", "option.provider"],
            }
        );

        if (alerts.length === 0) {
            return;
        }

        // Group alerts by option_id AND configuration (period + interval)
        // This allows us to batch alerts with the same calculation requirements
        const alertsByConfig = new Map<string, any[]>();
        for (const alert of alerts) {
            const period = alert.period;
            const interval = alert.interval || 86400;
            const lookback = (alert.condition?.lookbackPositions || 1) as number;

            // For alerts without explicit period, auto-calculate based on lookback
            let periodKey: string;
            if (period) {
                periodKey = JSON.stringify(period);
            } else {
                // Auto-calculated rolling period: (lookback + 1) * interval seconds
                periodKey = `auto_${(lookback + 1) * interval}`;
            }

            const configKey = `${alert.option.id}|${periodKey}|${interval}`;
            if (!alertsByConfig.has(configKey)) {
                alertsByConfig.set(configKey, []);
            }
            alertsByConfig.get(configKey)!.push(alert);
        }


        let evaluatedCount = 0;
        let triggeredCount = 0;
        let errorCount = 0;

        // Process each configuration group
        for (const [configKey, configAlerts] of alertsByConfig.entries()) {
            try {
                const firstAlert = configAlerts[0];
                const option_id = firstAlert.option.id;
                const period = firstAlert.period;
                const interval = firstAlert.interval || 86400;
                const lookback = firstAlert.condition?.lookbackPositions || 1;
                const now = new Date();
                const lastCompletedBoundary = getLastCompletedIntervalBoundary(now, interval);

                let periodStart: Date, periodEnd: Date;

                if (period) {
                    // Explicit period (calendar or custom)
                    ({ start: periodStart, end: periodEnd } = calculateDatesFromPeriod(period));
                    if (periodEnd > lastCompletedBoundary) {
                        periodEnd = lastCompletedBoundary;
                    }
                } else {
                    // Auto-calculate rolling period from lookback
                    // We need (lookback + 1) data points, so calculate that many intervals back
                    periodEnd = lastCompletedBoundary;
                    periodStart = new Date(periodEnd.getTime() - (lookback + 1) * interval * 1000);
                }

                if (periodEnd <= periodStart) {
                    continue;
                }

                // Calculate the statistic
                const { result: calculationResult } = await calculateStatisticsWorkflow(container).run({
                    input: {
                        options: [{ id: option_id }],
                        periodStart,
                        periodEnd,
                        interval,
                    },
                    throwOnError: true,
                });

                const calculatedValue = calculationResult.results?.[option_id];

                if (calculatedValue === undefined) {
                    const calculationError = calculationResult.errors?.[option_id] || "Unknown calculation error";
                    throw new MedusaError(
                        MedusaError.Types.INVALID_DATA,
                        `Failed to calculate option ${option_id}: ${calculationError}`
                    );
                }

                // Evaluate alerts for this option
                const { result: evaluationResult } = await evaluateAlertsWorkflow(container).run({
                    input: {
                        option_id,
                        calculated_value: calculatedValue,
                        evaluation_scope: {
                            periodStart,
                            periodEnd,
                            interval,
                        },
                    }
                });

                evaluatedCount += evaluationResult.alerts_evaluated;
                triggeredCount += evaluationResult.alerts_triggered;
            } catch (error: any) {
                errorCount++;
                logger.error(
                    `[Statistics Alerts Job] Error evaluating alerts for config ${configKey}:`,
                    error.message
                );
            }
        }
    } catch (error: any) {
        logger.error("[Statistics Alerts Job] Fatal error:", error);
        throw error;
    }
}

// Job configuration
export const config = {
    name: "evaluate-statistics-alerts",
    // Run every 5 minutes
    schedule: "*/1 * * * *",
};
