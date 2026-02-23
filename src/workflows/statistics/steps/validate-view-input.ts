import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";

export interface ValidateViewInputInput {
    name: string;
    description?: string;
    stats_data?: Record<string, any>;
    layout_config?: Record<string, any>;
    metadata?: Record<string, any>;
}

export const validateViewInputStep = createStep(
    "validate-view-input",
    async (input: ValidateViewInputInput) => {
        if (!input.name || input.name.trim().length === 0) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "View name is required and cannot be empty"
            );
        }

        if (input.name.length > 255) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "View name must be less than 255 characters"
            );
        }

        return new StepResponse({ validated: true });
    }
);
