import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { cloneViewStep } from "./steps/clone-view";

export interface CloneViewInput {
    source_view_id: string;
    new_name: string;
    new_description?: string;
    clone_stats_data?: boolean;
    clone_metadata?: boolean;
}

export const cloneViewWorkflow = createWorkflow(
    "clone-view",
    (input: CloneViewInput) => {
        const result = cloneViewStep(input);

        return new WorkflowResponse(result);
    }
);
