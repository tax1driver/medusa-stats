import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";
import { logger } from "@medusajs/framework";

export interface DedupeAlertsInput {
    alerts: any[];
    evaluation_results: Array<{
        alert_id: string;
        triggered: boolean;
        current_value: number;
        reference_value: number | null;
        compare_value: number | [number, number];
        operator: string;
        comparison_type: string;
    }>;
    evaluation_scope?: {
        periodStart?: Date;
        periodEnd?: Date;
        interval?: number;
    };
}

export interface AllowedAlertEvaluation {
    alert_id: string;
    evaluation_hash: string;
}

export const dedupeAlertsStep = createStep(
    "check-cooldown-period",
    async (input: DedupeAlertsInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);
        const allowedAlerts: AllowedAlertEvaluation[] = [];

        for (const result of input.evaluation_results) {
            if (!result.triggered) {
                continue;
            }

            const alert = input.alerts.find(a => a.id === result.alert_id);
            if (!alert) {
                continue;
            }

            const evaluationData = {
                current_value: result.current_value,
                reference_value: result.reference_value,
                compare_value: result.compare_value,
                threshold: alert.condition?.threshold ?? null,
                operator: result.operator,
                comparison_type: result.comparison_type,
                condition: alert.condition,
            };

            const evaluationScope = {
                periodStart: input.evaluation_scope?.periodStart
                    ? new Date(input.evaluation_scope.periodStart).toISOString()
                    : null,
                periodEnd: input.evaluation_scope?.periodEnd
                    ? new Date(input.evaluation_scope.periodEnd).toISOString()
                    : null,
                interval: input.evaluation_scope?.interval ?? null,
            };

            const evaluationHash = JSON.stringify({
                alert_id: alert.id,
                evaluationScope,
                evaluationData,
            });

            // De-duplication: skip if exact alert evaluation has already been logged
            try {
                const existingLogs = await statisticsService.listStatisticsAlertLogs(
                    {
                        alert_id: alert.id,
                        evaluation_hash: evaluationHash,
                    },
                    {
                        select: ["id"],
                        take: 1,
                    }
                );

                if (existingLogs.length > 0) {
                    continue;
                }
            } catch (error) {
                logger.error(`Error checking duplicate evaluation hash for alert ${alert.id}: ${error}`);
                continue;
            }

            allowedAlerts.push({
                alert_id: result.alert_id,
                evaluation_hash: evaluationHash,
            });
        }

        return new StepResponse(allowedAlerts);
    }
);
