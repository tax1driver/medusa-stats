import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { Query } from "@medusajs/framework";
import { z } from "zod";

export interface ValidateOptionParametersInput {
    options: Array<{
        provider_option_name: string;
        local_option_name: string;
        data: Record<string, any>;
        provider_id: string;
    }>;
    partialValidation?: boolean;
    throwOnError?: boolean;
}

export const validateOptionParametersStep = createStep(
    "validate-option-parameters",
    async (input: ValidateOptionParametersInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);
        const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY);

        const {
            options,
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

        const providerCache = new Map<string, any>();

        for (const option of options) {
            let providerInstance = providerCache.get(option.provider_id);
            if (!providerInstance) {
                providerInstance = statisticsService.getProvider(option.provider_id, query);
                providerCache.set(option.provider_id, providerInstance);
            }

            const stats = providerInstance.listStatistics();
            const statDefinition = stats.find(s => s.id === option.provider_option_name);

            if (!statDefinition) {
                const providerError = `Statistic ${option.provider_option_name} not found in provider ${option.provider_id}`;

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

            const errors: string[] = [];
            let isComplete = true;

            try {
                providerInstance.validateParameters(
                    option.provider_option_name,
                    option.data || {},
                    partialValidation
                );
            } catch (error) {
                if (error instanceof z.ZodError) {
                    errors.push(...error.issues.map(e => `${e.path.join(".")}: ${e.message}`));
                    isComplete = !error.issues.some(e => e.code === "invalid_type");
                } else {
                    errors.push("Unknown validation error");
                    isComplete = false;
                }
            }

            validationResults.push({
                option,
                isValid: errors.length === 0,
                errors,
                isComplete,
                statDefinition,
            });

            if (errors.length > 0 && throwOnError) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    `Invalid parameters for option ${option.local_option_name}: ${errors.join(", ")}`
                );
            }

            if (errors.length === 0) {
                validatedOptions.push(option);
            }
        }

        return new StepResponse({ validatedOptions, validationResults });
    }
);
