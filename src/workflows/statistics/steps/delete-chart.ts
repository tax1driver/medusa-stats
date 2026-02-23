import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";

export interface DeleteChartInput {
    id: string;
}

export const deleteChartStep = createStep(
    "delete-chart",
    async (input: DeleteChartInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);


        const [chart] = await statisticsService.listStatisticsCharts({ id: input.id });

        await statisticsService.deleteStatisticsCharts(input.id);

        return new StepResponse({ success: true }, chart);
    },
    async (originalChart: any, { container }) => {
        if (!originalChart) return;

        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);
        await statisticsService.createStatisticsCharts(originalChart);
    }
);
