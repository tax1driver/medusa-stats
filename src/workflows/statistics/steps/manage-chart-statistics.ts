import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";

export interface ManageChartStatisticsInput {
    chart_id: string;
    add_statistic_ids?: string[];
    remove_statistic_ids?: string[];
}

export const manageChartStatisticsStep = createStep(
    "manage-chart-statistics",
    async (input: ManageChartStatisticsInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);


        if (input.remove_statistic_ids && input.remove_statistic_ids.length > 0) {
            await statisticsService.removeStatisticsFromChart(input.chart_id, input.remove_statistic_ids);
        }


        if (input.add_statistic_ids && input.add_statistic_ids.length > 0) {
            await statisticsService.addStatisticsToChart(input.chart_id, input.add_statistic_ids);
        }

        return new StepResponse({ success: true }, input);
    },
    async (original: ManageChartStatisticsInput | undefined, { container }) => {
        if (!original) return;

        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);


        if (original.add_statistic_ids && original.add_statistic_ids.length > 0) {
            await statisticsService.removeStatisticsFromChart(original.chart_id, original.add_statistic_ids);
        }

        if (original.remove_statistic_ids && original.remove_statistic_ids.length > 0) {
            await statisticsService.addStatisticsToChart(original.chart_id, original.remove_statistic_ids);
        }
    }
);
