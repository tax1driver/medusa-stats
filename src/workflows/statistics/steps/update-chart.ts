import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";

export interface UpdateChartInput {
    id: string;
    name?: string;
    description?: string | null;
    visualization_config?: Record<string, any> | null;
    layout?: Record<string, any> | null;
    metadata?: Record<string, any> | null;
}

export const updateChartStep = createStep(
    "update-chart",
    async (input: UpdateChartInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);


        const cleanedInput = {
            id: input.id,
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description || undefined }),
            ...(input.visualization_config !== undefined && { visualization_config: input.visualization_config || undefined }),
            ...(input.layout !== undefined && { layout: input.layout || undefined }),
            ...(input.metadata !== undefined && { metadata: input.metadata || undefined }),
        };

        const updated = await statisticsService.updateStatisticsCharts(cleanedInput);

        return new StepResponse(updated, input);
    },
    async (original: UpdateChartInput | undefined, { container }) => {
        if (!original) return;

        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);


        const cleanedInput = {
            id: original.id,
            ...(original.name !== undefined && { name: original.name }),
            ...(original.description !== undefined && { description: original.description || undefined }),
            ...(original.visualization_config !== undefined && { visualization_config: original.visualization_config || undefined }),
            ...(original.layout !== undefined && { layout: original.layout || undefined }),
            ...(original.metadata !== undefined && { metadata: original.metadata || undefined }),
        };

        await statisticsService.updateStatisticsCharts(cleanedInput);
    }
);
