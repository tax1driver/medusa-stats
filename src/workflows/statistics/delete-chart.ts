import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { deleteChartStep } from "./steps/delete-chart";

export interface DeleteChartInput {
    id: string;
}

/**
 * Deletes a chart.
 * Associated statistics (series) are not deleted, only unlinked from the chart.
 */
export const deleteChartWorkflow = createWorkflow(
    "delete-chart",
    (input: DeleteChartInput) => {
        const result = deleteChartStep(input);

        return new WorkflowResponse(result);
    }
);
