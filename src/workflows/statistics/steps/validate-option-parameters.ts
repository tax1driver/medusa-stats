import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";
import { resolveStatisticDefinition, validateParameterData } from "../utils/parameter-utils";

export interface ValidateOptionParametersInput {
    options: Array<{
        provider_option_name: string;
        local_option_name: string;
        data: Record<string, any>;
        provider_id: string;
    }>;
    availableStatistics: Record<string, any[]>;
    partialValidation?: boolean;
    throwOnError?: boolean;
}

export const validateOptionParametersStep = createStep(
    "validate-option-parameters",
    async (input: ValidateOptionParametersInput) => {
        const {
            options,
            availableStatistics,
            partialValidation = true,
            throwOnError = true,
        } = input;

        const validatedOptions: any[] = [];
        const validationResults: Array<{
            option: ValidateOptionParametersInput["options"][number];
            isValid: boolean;
            errors: string[];
            isComplete: boolean;
            statDefinition?: any;
        }> = [];

        for (const option of options) {
            const { statDefinition, error } = resolveStatisticDefinition(
                availableStatistics,
                option.provider_id,
                option.provider_option_name
            );

            if (!statDefinition || error) {
                const providerError = error ?? "Invalid option configuration";

                validationResults.push({
                    option,
                    isValid: false,
                    errors: [providerError],
                    isComplete: false,
                });

                if (throwOnError) {
                    throw new MedusaError(MedusaError.Types.INVALID_DATA, providerError);
                }

                continue;
            }

            const validation = validateParameterData(
                option.data || {},
                statDefinition.parameters.fields,
                { partial: partialValidation }
            );

            validationResults.push({
                option,
                isValid: validation.isValid,
                errors: validation.errors,
                isComplete: validation.isComplete,
                statDefinition,
            });

            if (!validation.isValid && throwOnError) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    `Invalid parameters for option ${option.local_option_name}: ${validation.errors.join(", ")}`
                );
            }

            if (validation.isValid) {
                validatedOptions.push(option);
            }
        }

        return new StepResponse({ validatedOptions, validationResults });
    }
);
