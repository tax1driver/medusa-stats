import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import {
    calculateStatisticsStep,
    type CalculateStatisticsInput,
} from "./steps/calculate-statistics";

export type CalculateStatisticsWorkflowInput = CalculateStatisticsInput;

export const calculateStatisticsWorkflow = createWorkflow(
    "calculate-statistics-workflow",
    function (input: CalculateStatisticsWorkflowInput) {
        const calculation = calculateStatisticsStep(input);

        return new WorkflowResponse({
            results: calculation.results,
            errors: calculation.errors,
            metadata: calculation.metadata,
            duration: calculation.duration,
        });
    }
);
