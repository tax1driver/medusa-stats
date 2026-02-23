import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { fetchOptionWithRelationsStep } from "./steps/fetch-option-with-relations";
import { fetchAvailableStatisticsStep } from "./steps/fetch-available-statistics";
import { validateOptionParametersStep } from "./steps/validate-option-parameters";

export interface ValidateOptionConfigurationInput {
    option_id: string;
}

export const validateOptionConfigurationWorkflow = createWorkflow(
    "validate-option-configuration",
    (input: ValidateOptionConfigurationInput) => {

        const option = fetchOptionWithRelationsStep({ option_id: input.option_id });


        const availableStatistics = fetchAvailableStatisticsStep({});


        const validation = validateOptionParametersStep({
            options: [
                {
                    provider_option_name: option.provider_option_name,
                    local_option_name: option.local_option_name,
                    data: option.data,
                    provider_id: option.provider.id,
                },
            ],
            availableStatistics,
            partialValidation: false,
            throwOnError: false,
        });

        const result = transform(validation, (data) => {
            const firstResult = data.validationResults[0];

            return {
                isValid: firstResult?.isValid ?? false,
                errors: firstResult?.errors ?? ["Invalid option configuration"],
                isComplete: firstResult?.isComplete ?? false,
                statDefinition: firstResult?.statDefinition,
            };
        });

        return new WorkflowResponse(result);
    }
);
