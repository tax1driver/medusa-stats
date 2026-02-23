import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";
import type { ExtractedAlertValues } from "./extract-alert-values";
import type { AllowedAlertEvaluation } from "./dedupe-alerts";
import { logger } from "@medusajs/framework";

export interface CreateAlertLogEntriesInput {
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
    allowed_alerts: AllowedAlertEvaluation[];
    extracted_values: Record<string, ExtractedAlertValues>;
}

export const createAlertLogEntriesStep = createStep(
    "create-alert-log-entries",
    async (input: CreateAlertLogEntriesInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);
        const createdLogs: any[] = [];

        for (const allowed of input.allowed_alerts) {
            const alert_id = allowed.alert_id;
            const alert = input.alerts.find(a => a.id === alert_id);
            const evaluation = input.evaluation_results.find(e => e.alert_id === alert_id);

            if (!alert || !evaluation) continue;

            try {
                const evaluationData = {
                    current_value: evaluation.current_value,
                    reference_value: evaluation.reference_value,
                    compare_value: evaluation.compare_value,
                    threshold: alert.condition?.threshold ?? null,
                    operator: evaluation.operator,
                    comparison_type: evaluation.comparison_type,
                    condition: alert.condition,
                };


                const log = await statisticsService.createStatisticsAlertLogs({
                    alert_id: alert.id,
                    triggered_at: new Date(),
                    evaluation_data: evaluationData,
                    evaluation_hash: allowed.evaluation_hash,
                    metadata: {
                        comparison_type: evaluation.comparison_type,
                        operator: evaluation.operator
                    }
                });

                createdLogs.push(log);
            } catch (error: any) {
                logger.error(`Failed to create alert log for alert ${alert_id}: ${error}`);
            }
        }

        return new StepResponse(createdLogs);
    },
    async (createdLogs: any[] | undefined, { container }) => {

        if (!createdLogs || createdLogs.length === 0) {
            return;
        }

        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);
        await statisticsService.deleteStatisticsAlertLogs(createdLogs.map(log => log.id));
    }
);
