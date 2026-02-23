import { createWorkflow, WorkflowResponse, transform, when } from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";
import { calculateStatisticsStep } from "./steps/calculate-statistics";
import { evaluateAlertsWorkflow } from "./evaluate-alerts";

export interface CalculateSingleStatisticInput {
    option_id: string;
    periodStart: Date;
    periodEnd: Date;
    interval: number;
    runtimeParameters?: Record<string, any>;
    metadata?: Record<string, any>;
    cache_options_override?: { enabled?: boolean; ttl?: number } | null;
}

export const calculateSingleStatisticWorkflow = createWorkflow(
    "calculate-single-statistic",
    function (input: CalculateSingleStatisticInput) {
        const calculation = calculateStatisticsStep({
            options: [{ id: input.option_id }],
            sharedCacheOptions: input.cache_options_override || undefined,
            runtimeParameters: input.runtimeParameters || {},
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            interval: input.interval,
        });

        const result = transform({ calculation, input }, (data) => {
            const value = data.calculation.results?.[data.input.option_id];

            if (value !== undefined) {
                return value;
            }

            const error = data.calculation.errors?.[data.input.option_id];

            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                error || `Failed to calculate option ${data.input.option_id}`
            );
        });

        return new WorkflowResponse({
            result,
        });
    }
);
