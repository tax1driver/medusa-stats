import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";
import { MedusaError } from "@medusajs/framework/utils";

export interface CloneViewInput {
    source_view_id: string;
    new_name: string;
    new_description?: string;
    clone_stats_data?: boolean;
    clone_metadata?: boolean;
}

export const cloneViewStep = createStep(
    "clone-view",
    async (input: CloneViewInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);


        const sourceView = await statisticsService.retrieveStatisticsView(
            input.source_view_id,
            { relations: ["charts", "charts.statistics"] }
        );


        const newView = await statisticsService.createStatisticsViews({
            name: input.new_name,
            description: input.new_description || sourceView.description,
            stats_data: input.clone_stats_data !== false ? sourceView.stats_data : null,
            layout_config: sourceView.layout_config,
            metadata: input.clone_metadata !== false ? sourceView.metadata : undefined
        });

        const uniqueOptionsById = new Map<string, any>();
        for (const chart of (sourceView as any).charts || []) {
            for (const option of chart.statistics || []) {
                if (option?.id && !uniqueOptionsById.has(option.id)) {
                    uniqueOptionsById.set(option.id, option);
                }
            }
        }


        const clonedOptions = await Promise.all(
            Array.from(uniqueOptionsById.values()).map(async (option: any) => {
                return await statisticsService.createStatisticsOptions({
                    provider_option_name: option.provider_option_name,
                    local_option_name: option.local_option_name,
                    data: option.data,
                    provider_id: option.provider_id,
                });
            })
        );

        return new StepResponse(
            { view: newView, options: clonedOptions },
            newView.id
        );
    },
    async (viewId: string, { container }) => {
        if (!viewId) return;

        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);


        await statisticsService.deleteStatisticsViews(viewId);
    }
);
