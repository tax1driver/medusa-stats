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

        validateViewInputStep(input.view);


        const view = createStatisticsViewStep(input.view);


        const providerIds = transform(input.options, (input) => {
            return [...new Set(input.map(opt => opt.provider_id))];
        });

        const availableStatistics = fetchAvailableStatisticsStep({});


        validateOptionParametersStep({
            options: input.options,
            availableStatistics
        });


        const createdOptions = createStatisticsOptionsStep({
            options: input.options
        });

        return new WorkflowResponse({
            view,
            options: createdOptions
        });
    }
);
