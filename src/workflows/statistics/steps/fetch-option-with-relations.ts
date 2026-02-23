import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";

export interface FetchOptionWithRelationsInput {
    option_id: string;
}

export const fetchOptionWithRelationsStep = createStep(
    "fetch-option-with-relations",
    async (input: FetchOptionWithRelationsInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);

        const option = await statisticsService.retrieveStatisticsOption(
            input.option_id,
            { relations: ["provider"] }
        );

        return new StepResponse(option);
    }
);
