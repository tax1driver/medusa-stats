import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";

export interface CreateChartInput {
    view_id: string;
    name: string;
    description?: string;
    visualization_config?: Record<string, any>;
    layout?: Record<string, any>;
    metadata?: Record<string, any>;
    statistic_ids?: string[];
}

export const createChartStep = createStep(
    "create-chart",
    async (input: CreateChartInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);

        const chart = await statisticsService.createStatisticsCharts(input);

        // Link statistics to chart if provided
        if (input.statistic_ids && input.statistic_ids.length > 0) {
            await statisticsService.addStatisticsToChart(chart.id, input.statistic_ids);
        }

        return new StepResponse(chart, chart.id);
    },
    async (chartId: string | undefined, { container }) => {
        if (!chartId) return;

        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);
        await statisticsService.deleteStatisticsCharts(chartId);
    }
);
