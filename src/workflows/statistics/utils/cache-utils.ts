export const STATISTICS_CACHE_CONFIG = {

    DEFAULT_TTL: 300,
    KEY_PREFIX: "stats:",
} as const;

export function getStatisticCacheKeyData(params: {
    option_id: string;
    periodStart: Date;
    periodEnd: Date;
    interval: number;
    parameters: Record<string, any>;
}) {
    const { option_id, periodStart, periodEnd, interval, parameters } = params;

    return {
        prefix: STATISTICS_CACHE_CONFIG.KEY_PREFIX,
        type: "single",
        option_id,
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
        interval,
        parameters
    };
}

export async function generateStatisticCacheKey(
    cacheService: any,
    params: {
        option_id: string;
        periodStart: Date;
        periodEnd: Date;
        interval: number;
        parameters: Record<string, any>;
    }
): Promise<string> {
    const keyData = getStatisticCacheKeyData(params);
    return cacheService.computeKey(keyData);
}

export function isCachingEnabled(
    optionCacheOptions?: { enabled?: boolean; ttl?: number } | null,
    viewCacheOptions?: { enabled?: boolean; ttl?: number } | null
): boolean {

    if (optionCacheOptions?.enabled !== undefined) {
        return optionCacheOptions.enabled;
    }


    if (viewCacheOptions?.enabled !== undefined) {
        return viewCacheOptions.enabled;
    }


    return true;
}

export function getEffectiveCacheTTL(
    optionCacheOptions?: { enabled?: boolean; ttl?: number } | null,
    viewCacheOptions?: { enabled?: boolean; ttl?: number } | null
): number {

    if (optionCacheOptions?.ttl !== undefined && optionCacheOptions.ttl > 0) {
        return optionCacheOptions.ttl;
    }


    if (viewCacheOptions?.ttl !== undefined && viewCacheOptions.ttl > 0) {
        return viewCacheOptions.ttl;
    }


    return STATISTICS_CACHE_CONFIG.DEFAULT_TTL;
}
