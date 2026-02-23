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

        const alerts = await statisticsService.listStatisticsAlerts(
            { is_enabled: true },
            {
                relations: ["option", "option.provider"],
            }
        );

        if (alerts.length === 0) {
            return;
        }



        const alertsByConfig = new Map<string, any[]>();
        for (const alert of alerts) {
            const period = alert.period;
            const interval = alert.interval || 86400;
            const lookback = (alert.condition?.lookbackPositions || 1) as number;


            let periodKey: string;
            if (period) {
                periodKey = JSON.stringify(period);
            } else {

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

                    ({ start: periodStart, end: periodEnd } = calculateDatesFromPeriod(period));
                    if (periodEnd > lastCompletedBoundary) {
                        periodEnd = lastCompletedBoundary;
                    }
                } else {


                    periodEnd = lastCompletedBoundary;
                    periodStart = new Date(periodEnd.getTime() - (lookback + 1) * interval * 1000);
                }

                if (periodEnd <= periodStart) {
                    continue;
                }


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


export const config = {
    name: "evaluate-statistics-alerts",

    schedule: "*/1 * * * *",
};
