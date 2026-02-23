import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { manageChartStatisticsStep } from "./steps/manage-chart-statistics";

export interface ManageChartStatisticsInput {
    chart_id: string;
    add_statistic_ids?: string[];
    remove_statistic_ids?: string[];
}

/**
 * Manages statistics (series) in a chart.
 * Can add and/or remove statistics in a single operation.
 */
export const manageChartStatisticsWorkflow = createWorkflow(
    "manage-chart-statistics",
    (input: ManageChartStatisticsInput) => {
        const result = manageChartStatisticsStep(input);

        return new WorkflowResponse(result);
    }
);
