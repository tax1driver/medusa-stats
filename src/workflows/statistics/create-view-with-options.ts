import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { validateViewInputStep } from "./steps/validate-view-input";
import { createStatisticsViewStep } from "./steps/create-statistics-view";
import { fetchAvailableStatisticsStep } from "./steps/fetch-available-statistics";
import { validateOptionParametersStep } from "./steps/validate-option-parameters";
import { createStatisticsOptionsStep } from "./steps/create-statistics-options";

export interface CreateViewWithOptionsInput {
    view: {
        name: string;
        description?: string;
        stats_data?: Record<string, any>;
        layout_config?: Record<string, any>;
        metadata?: Record<string, any>;
        period_type?: "rolling" | "calendar" | "custom";
        period_config?: Record<string, any>;
        interval?: number;
    };
    options: Array<{
        provider_option_name: string;
        local_option_name: string;
        data: Record<string, any>;
        provider_id: string;
    }>;
}

export const createViewWithOptionsWorkflow = createWorkflow(
    "create-view-with-options",
    (input: CreateViewWithOptionsInput) => {
        // Step 1: Validate view input
        validateViewInputStep(input.view);

        // Step 2: Create the view
        const view = createStatisticsViewStep(input.view);

        // Step 3: Fetch available statistics from providers
        const providerIds = transform(input.options, (input) => {
            return [...new Set(input.map(opt => opt.provider_id))];
        });
        //const providerIds = [...new Set(input.options?.map(opt => opt.provider_id))];
        const availableStatistics = fetchAvailableStatisticsStep({});

        // Step 4: Validate option parameters
        validateOptionParametersStep({
            options: input.options,
            availableStatistics
        });

        // Step 5: Create statistics options
        const createdOptions = createStatisticsOptionsStep({
            options: input.options
        });

        return new WorkflowResponse({
            view,
            options: createdOptions
        });
    }
);
