import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { deleteChartStep } from "./steps/delete-chart";

export interface DeleteChartInput {
    id: string;
}

export const deleteChartWorkflow = createWorkflow(
    "delete-chart",
    (input: DeleteChartInput) => {
        const result = deleteChartStep(input);

        return new WorkflowResponse(result);
    }
);
