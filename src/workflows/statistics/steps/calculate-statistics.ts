import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils";
import { logger, Query } from "@medusajs/framework";
import { hasCompleteData, mergeParameters, validateParameters } from "../utils/parameter-utils";
import { generateStatisticCacheKey, isCachingEnabled, getEffectiveCacheTTL } from "../utils/cache-utils";
import { DependencyGraphUtils } from "../utils/dependency-graph";

type OptionInput = {
    id: string;
    provider?: { id: string };
    provider_option_name?: string;
    local_option_name?: string;
    data?: Record<string, any>;
    cache_options?: Record<string, any> | null;
    input_dependencies?: any[];
    parameter_config?: Record<string, any> | null;
};

export interface CalculateStatisticsInput {
    options: Array<OptionInput | { id: string }>;
    sharedStatsData?: Record<string, any> | null;
    sharedCacheOptions?: Record<string, any> | null;
    runtimeParameters?: Record<string, any>;
    periodStart: Date;
    periodEnd: Date;
    interval: number;
}


export const calculateStatisticsStep = createStep(
    "calculate-statistics",
    async (input: CalculateStatisticsInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);
        const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY);
        let cacheService: any | undefined;

        try {
            cacheService = container.resolve(Modules.CACHING);
        } catch {
            cacheService = undefined;
        }

        const {
            options: inputOptions,
            sharedStatsData,
            sharedCacheOptions,
            runtimeParameters = {},
            periodStart,
            periodEnd,
            interval,
        } = input;

        const operationStartTime = Date.now();
        const results: Record<string, any> = {};
        const errors: Record<string, string> = {};
        const metadata: Record<string, { fromCache: boolean; cachedAt?: string; calculationTime: number }> = {};


        const providerStatsMap = new Map<string, any[]>();

        for (const optionInput of inputOptions || []) {
            const optionId = optionInput?.id;

            if (!optionId) {
                continue;
            }

            try {
                const statStartTime = Date.now();


                const fullOption = await statisticsService.retrieveStatisticsOption(optionId, {
                    relations: ["provider", "input_dependencies"],
                });


                const hasDependencies =
                    !!fullOption.input_dependencies &&
                    fullOption.input_dependencies.length > 0;

                if (hasDependencies) {
                    const dependencyTree = await DependencyGraphUtils.buildDependencyTree(
                        fullOption.id,
                        statisticsService
                    );
                    const calculationOrder = DependencyGraphUtils.getCalculationOrder(dependencyTree);

                    const calculatedResults = new Map<string, any>();
                    let finalFromCache = false;
                    let finalCachedAt: string | undefined;

                    for (const depOptionId of calculationOrder) {
                        if (calculatedResults.has(depOptionId)) {
                            continue;
                        }

                        const depOption = await statisticsService.retrieveStatisticsOption(depOptionId, {
                            relations: ["provider", "input_dependencies"],
                        });

                        if (!depOption.provider) {
                            throw new MedusaError(
                                MedusaError.Types.INVALID_DATA,
                                `Statistics option ${depOptionId} has no associated provider`
                            );
                        }

                        const providerInstance = statisticsService.getProvider(depOption.provider.id, query);


                        let availableStats = providerStatsMap.get(depOption.provider.id);
                        if (!availableStats) {
                            availableStats = await providerInstance.getAvailableStatistics();
                            providerStatsMap.set(depOption.provider.id, availableStats);
                        }

                        const statDefinition = availableStats.find(s => s.id === depOption.provider_option_name);

                        if (!statDefinition) {
                            throw new MedusaError(
                                MedusaError.Types.INVALID_DATA,
                                `Statistic definition not found: ${depOption.provider_option_name}`
                            );
                        }

                        let parameters = mergeParameters(
                            depOption.data || {},
                            sharedStatsData || {},
                            runtimeParameters,
                            depOption.local_option_name,
                            depOption.provider_option_name,
                            depOption.provider.id
                        );

                        if (depOption.input_dependencies && depOption.input_dependencies.length > 0) {
                            const dependencyResults: Record<string, any> = {};

                            for (const dep of depOption.input_dependencies as any[]) {
                                const inputId = dep.input_option?.id || dep.input_option_id;
                                const paramName = dep.parameter_name;
                                const value = calculatedResults.get(inputId);

                                if (value === undefined) {
                                    throw new MedusaError(
                                        MedusaError.Types.INVALID_DATA,
                                        `Dependency result not found for ${inputId}`
                                    );
                                }

                                dependencyResults[paramName] = value;
                            }

                            if (depOption.parameter_config) {
                                for (const [paramName, config] of Object.entries(depOption.parameter_config as Record<string, any>)) {
                                    if (config.locked) {
                                        parameters[paramName] = config.value;
                                    }
                                }
                            }

                            parameters = { ...parameters, ...dependencyResults };
                        }

                        const validatedParameters = validateParameters(
                            parameters,
                            statDefinition.parameters.fields
                        );

                        const cachingEnabled = !!cacheService && isCachingEnabled(
                            depOption.cache_options as any,
                            sharedCacheOptions as any
                        );

                        let value: any = null;
                        let cacheKey: string | null = null;

                        if (cachingEnabled) {
                            cacheKey = await generateStatisticCacheKey(cacheService, {
                                option_id: depOption.id,
                                periodStart,
                                periodEnd,
                                interval,
                                parameters: validatedParameters,
                            });

                            const cached = await cacheService.get({ key: cacheKey });

                            if (cached) {
                                value = cached.data || cached;
                                if (depOption.id === optionId) {
                                    finalFromCache = true;
                                    finalCachedAt = cached.cachedAt || new Date().toISOString();
                                }
                            }
                        }

                        if (value === null) {
                            value = await providerInstance.calculateStatistic({
                                id: depOption.provider_option_name,
                                parameters: validatedParameters,
                                fields: statDefinition.parameters.fields,
                                periodStart: new Date(periodStart),
                                periodEnd: new Date(periodEnd),
                                interval
                            });

                            if (cachingEnabled && cacheKey) {
                                const effectiveTTL = getEffectiveCacheTTL(
                                    depOption.cache_options as any,
                                    sharedCacheOptions as any
                                );

                                const cachedAt = new Date().toISOString();

                                await cacheService.set({
                                    key: cacheKey,
                                    data: {
                                        data: value,
                                        cachedAt
                                    },
                                    ttl: effectiveTTL
                                });
                            }
                        }

                        calculatedResults.set(depOption.id, value);
                    }

                    const finalValue = calculatedResults.get(optionId);

                    if (finalValue === undefined) {
                        throw new MedusaError(
                            MedusaError.Types.INVALID_DATA,
                            `Failed to calculate composite statistic ${optionId}`
                        );
                    }

                    results[optionId] = finalValue;
                    metadata[optionId] = {
                        fromCache: finalFromCache,
                        cachedAt: finalCachedAt,
                        calculationTime: Date.now() - statStartTime,
                    };

                    continue;
                }

                if (!fullOption.provider) {
                    throw new MedusaError(
                        MedusaError.Types.INVALID_DATA,
                        `Statistics option ${optionId} has no associated provider`
                    );
                }


                const providerInstance = statisticsService.getProvider(fullOption.provider.id, query);


                let availableStats = providerStatsMap.get(fullOption.provider.id);
                if (!availableStats) {
                    availableStats = await providerInstance.getAvailableStatistics();
                    providerStatsMap.set(fullOption.provider.id, availableStats);
                }

                const statDefinition = availableStats.find(s => s.id === fullOption.provider_option_name);

                if (!statDefinition) {
                    throw new MedusaError(
                        MedusaError.Types.INVALID_DATA,
                        `Statistic definition not found: ${fullOption.provider_option_name}`
                    );
                }


                const mergedParameters = mergeParameters(
                    fullOption.data || {},
                    sharedStatsData || {},
                    runtimeParameters,
                    fullOption.local_option_name,
                    fullOption.provider_option_name,
                    fullOption.provider.id
                );


                const validatedParameters = validateParameters(
                    mergedParameters,
                    statDefinition.parameters.fields
                );


                const cachingEnabled = !!cacheService && isCachingEnabled(
                    fullOption.cache_options as any,
                    sharedCacheOptions as any
                );

                let cachedResult: any = null;
                let cacheKey: string | null = null;

                if (cachingEnabled) {

                    cacheKey = await generateStatisticCacheKey(cacheService, {
                        option_id: fullOption.id,
                        periodStart,
                        periodEnd,
                        interval,
                        parameters: validatedParameters
                    });


                    cachedResult = await cacheService.get({
                        key: cacheKey
                    });

                    if (cachedResult) {
                        results[fullOption.id] = cachedResult.data || cachedResult;
                        metadata[fullOption.id] = {
                            fromCache: true,
                            cachedAt: cachedResult.cachedAt || new Date().toISOString(),
                            calculationTime: Date.now() - statStartTime
                        };
                        continue;
                    }
                }


                const result = await providerInstance.calculateStatistic({
                    id: fullOption.provider_option_name,
                    parameters: validatedParameters,
                    fields: statDefinition.parameters.fields,
                    periodStart: new Date(periodStart),
                    periodEnd: new Date(periodEnd),
                    interval
                });

                const statCalculationTime = Date.now() - statStartTime;


                metadata[fullOption.id] = {
                    fromCache: false,
                    calculationTime: statCalculationTime
                };


                if (cachingEnabled && cacheKey) {
                    const effectiveTTL = getEffectiveCacheTTL(
                        fullOption.cache_options as any,
                        sharedCacheOptions as any
                    );

                    const cachedAt = new Date().toISOString();

                    await cacheService.set({
                        key: cacheKey,
                        data: {
                            data: result,
                            cachedAt
                        },
                        ttl: effectiveTTL
                    });
                }

                results[fullOption.id] = result;
            } catch (error) {
                logger.error(`Error calculating statistic for option ${optionId}: ${error}`);
            }
        }

        const totalDuration = (Date.now() - operationStartTime) / 1000;

        return new StepResponse({
            results,
            errors: Object.keys(errors).length > 0 ? errors : undefined,
            definitions: Object.fromEntries(providerStatsMap.entries()),
            metadata,
            duration: totalDuration
        });
    }
);
