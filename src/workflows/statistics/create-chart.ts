import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { createChartStep } from "./steps/create-chart";

export interface CreateChartInput {
    view_id: string;
    name: string;
    description?: string;
    visualization_config?: Record<string, any>;
    layout?: Record<string, any>;
    metadata?: Record<string, any>;
    statistic_ids?: string[];
}

/**
 * Creates a new chart for a statistics view.
 * Optionally links statistics (series) to the chart on creation.
 */
export const createChartWorkflow = createWorkflow(
    "create-chart",
    (input: CreateChartInput) => {
        const chart = createChartStep(input);

        return new WorkflowResponse(chart);
    }
);
