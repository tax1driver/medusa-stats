import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { fetchAvailableStatisticsStep } from "./steps/fetch-available-statistics";

export interface GetAvailableStatisticsInput {
    provider_id?: string;
    sales_channel_id?: string;
}

export const getAvailableStatisticsWorkflow = createWorkflow(
    "get-available-statistics",
    (input: GetAvailableStatisticsInput) => {
        const result = fetchAvailableStatisticsStep(input);

        return new WorkflowResponse(result);
    }
);
