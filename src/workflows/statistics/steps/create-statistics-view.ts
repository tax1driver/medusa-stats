import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";

export interface CreateStatisticsViewInput {
    name: string;
    description?: string;
    stats_data?: Record<string, any>;
    layout_config?: Record<string, any>;
    metadata?: Record<string, any>;
    period_type?: "rolling" | "calendar" | "custom";
    period_config?: Record<string, any>;
    interval?: number;
}

export const createStatisticsViewStep = createStep(
    "create-statistics-view",
    async (input: CreateStatisticsViewInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);

        const view = await statisticsService.createStatisticsViews(input);

        return new StepResponse(view, view.id);
    },
    async (viewId: string, { container }) => {
        if (!viewId) return;

        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);
        await statisticsService.deleteStatisticsViews(viewId);
    }
);
