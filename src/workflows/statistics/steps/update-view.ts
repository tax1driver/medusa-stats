import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";
import { logger } from "@medusajs/framework";

export interface UpdateViewInput {
    id: string;
    name?: string;
    description?: string;
    stats_data?: Record<string, any>;
    layout_config?: Record<string, any>;
    metadata?: Record<string, any>;
    period_type?: "rolling" | "calendar" | "custom";
    period_config?: Record<string, any>;
    interval?: number;
}

export const updateViewStep = createStep(
    "update-view",
    async (input: UpdateViewInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);

        logger.info(`Updating statistics view with ID: ${JSON.stringify(input)}`);
        const updatedView = await statisticsService.updateStatisticsViews([input]);

        return new StepResponse(updatedView, { previousData: input });
    },
    async (compensationData: { previousData: any }, { container }) => {
        if (!compensationData) return;

        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);


        await statisticsService.updateStatisticsViews([compensationData.previousData]);
    }
);
