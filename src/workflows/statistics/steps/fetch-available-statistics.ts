import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { AbstractStatisticsProvider, STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";
import { logger, Query } from "@medusajs/framework";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";

export interface FetchAvailableStatisticsInput {
    provider_id?: string;
}

export const fetchAvailableStatisticsStep = createStep(
    "fetch-available-statistics",
    async (input: FetchAvailableStatisticsInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);
        const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY);

        const { provider_id } = input;


        const providers = await statisticsService.listStatisticsProviders({
            id: provider_id,
        });

        const result: Record<string, any[]> = {};

        for (const provider of providers) {

            try {

                const providerInstance = statisticsService.getProvider(provider.id, query);
                const statistics = await providerInstance.getAvailableStatistics();


                const enrichedStats = statistics.map(stat => ({
                    ...stat,
                    provider_id: provider.id,
                    provider
                }));

                result[provider.id] = enrichedStats;
            } catch (error) {
                if (error instanceof MedusaError) {
                    if (error.type === MedusaError.Types.NOT_FOUND) {
                        result[provider.id] = [];
                        continue;
                    }
                }

                logger.error(`Error fetching statistics from provider ${provider.id}: ${error}`);
            }
        }

        return new StepResponse(result);
    }
);
