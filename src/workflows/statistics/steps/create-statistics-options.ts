import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";

export interface CreateStatisticsOptionsInput {
    options: Array<{
        provider_option_name: string;
        local_option_name: string;
        data: Record<string, any>;
        provider_id: string;
    }>;
}

export const createStatisticsOptionsStep = createStep(
    "create-statistics-options",
    async (input: CreateStatisticsOptionsInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);

        const createdOptions = await statisticsService.createStatisticsOptions(input.options);

        return new StepResponse(
            createdOptions,
            createdOptions.map((opt: any) => opt.id)
        );
    },
    async (optionIds: string[], { container }) => {
        if (!optionIds || optionIds.length === 0) return;

        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);
        await statisticsService.deleteStatisticsOptions(optionIds);
    }
);
