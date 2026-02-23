import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { updateChartStep } from "./steps/update-chart";

export interface UpdateChartInput {
    id: string;
    name?: string;
    description?: string | null;
    visualization_config?: Record<string, any> | null;
    layout?: Record<string, any> | null;
    metadata?: Record<string, any> | null;
}

/**
 * Updates a chart's configuration.
 */
export const updateChartWorkflow = createWorkflow(
    "update-chart",
    (input: UpdateChartInput) => {
        const updatedChart = updateChartStep(input);

        return new WorkflowResponse(updatedChart);
    }
);
