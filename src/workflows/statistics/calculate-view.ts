import { createWorkflow, WorkflowResponse, transform, when } from "@medusajs/framework/workflows-sdk";
import { fetchViewWithOptionsStep } from "./steps/fetch-view-with-options";
import { calculateStatisticsStep } from "./steps/calculate-statistics";
export interface CalculateViewInput {
    view_id: string;
    periodStart: Date;
    periodEnd: Date;
    interval: number;
}

export const calculateViewWorkflow = createWorkflow(
    "calculate-view",
    (input: CalculateViewInput) => {

        const view = fetchViewWithOptionsStep({ view_id: input.view_id });

        const calculationContext = transform({ view }, ({ view }) => ({
            options: (view as any).statistics || [],
            sharedStatsData: (view as any).stats_data,
            sharedCacheOptions: (view as any).cache_options,
        }));


        const calculationResult = calculateStatisticsStep({
            options: calculationContext.options,
            sharedStatsData: calculationContext.sharedStatsData,
            sharedCacheOptions: calculationContext.sharedCacheOptions,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            interval: input.interval,
        });

        return new WorkflowResponse({
            results: calculationResult.results,
            errors: calculationResult.errors,
            definitions: calculationResult.definitions,
            metadata: calculationResult.metadata,
            duration: calculationResult.duration,
        });
    }
);
