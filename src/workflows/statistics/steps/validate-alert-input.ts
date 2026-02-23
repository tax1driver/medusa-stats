import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";

export const validateAlertInputStep = createStep(
    "validate-alert-input",
    async (input: any) => {
        const condition = input?.condition || {};


        if (input.condition.operator === "between") {
            if (!Array.isArray(condition.threshold) || condition.threshold.length !== 2) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    "For 'between' operator, threshold must be an array of two numbers"
                );
            }
        } else {
            if (Array.isArray(condition.threshold)) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    `For '${input.condition.operator}' operator, threshold must be a single number`
                );
            }

            if (condition.comparisonType === "absolute" && typeof condition.threshold !== "number") {
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    "For absolute comparison, threshold must be a number"
                );
            }
        }


        if (!["absolute", "relative"].includes(condition.comparisonType)) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "comparisonType must be either 'absolute' or 'relative'"
            );
        }


        if (condition.comparisonType === "relative") {
            if (condition.lookbackPositions !== undefined && (!Number.isInteger(condition.lookbackPositions) || condition.lookbackPositions < 1)) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    "lookbackPositions must be a positive integer"
                );
            }

            if (condition.changeType !== undefined && !["absolute", "percentage"].includes(condition.changeType)) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    "changeType must be either 'absolute' or 'percentage'"
                );
            }
        }

        return new StepResponse(input);
    }
);
