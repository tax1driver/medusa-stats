import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";

export interface FetchViewWithOptionsInput {
    view_id: string;
}

export const fetchViewWithOptionsStep = createStep(
    "fetch-view-with-options",
    async (input: FetchViewWithOptionsInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);

        const view = await statisticsService.retrieveStatisticsView(
            input.view_id,
            { relations: ["charts", "charts.statistics", "charts.statistics.provider"] }
        );

        const statisticsMap = new Map<string, any>();
        for (const chart of (view as any).charts || []) {
            for (const option of chart.statistics || []) {
                if (option?.id && !statisticsMap.has(option.id)) {
                    statisticsMap.set(option.id, option);
                }
            }
        }

        (view as any).statistics = Array.from(statisticsMap.values());

        return new StepResponse(view);
    }
);
