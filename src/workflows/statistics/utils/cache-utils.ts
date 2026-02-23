/**
 * Configuration for statistics cache
 */
export const STATISTICS_CACHE_CONFIG = {
    // Default TTL: 5 minutes (300 seconds)
    DEFAULT_TTL: 300,
    KEY_PREFIX: "stats:",
} as const;

/**
 * Generates cache key data for a single statistic calculation
 * To be used with cacheService.computeKey()
 */
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

/**
 * Helper to build cache key for a statistic option
 * Uses cacheService.computeKey internally
 */
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

/**
 * Check if caching is enabled for an option
 * Checks both option-level and view-level cache_options
 * If cache_options is not set or enabled is not specified, caching is enabled by default
 */
export function isCachingEnabled(
    optionCacheOptions?: { enabled?: boolean; ttl?: number } | null,
    viewCacheOptions?: { enabled?: boolean; ttl?: number } | null
): boolean {
    // Option-level cache_options takes precedence
    if (optionCacheOptions?.enabled !== undefined) {
        return optionCacheOptions.enabled;
    }

    // View-level cache_options is secondary
    if (viewCacheOptions?.enabled !== undefined) {
        return viewCacheOptions.enabled;
    }

    // Default: caching is enabled
    return true;
}

/**
 * Determine effective TTL for a statistic calculation
 * Priority: option.cache_options.ttl > view.cache_options.ttl > default TTL
 */
export function getEffectiveCacheTTL(
    optionCacheOptions?: { enabled?: boolean; ttl?: number } | null,
    viewCacheOptions?: { enabled?: boolean; ttl?: number } | null
): number {
    // Option-level TTL takes highest precedence
    if (optionCacheOptions?.ttl !== undefined && optionCacheOptions.ttl > 0) {
        return optionCacheOptions.ttl;
    }

    // View-level TTL is secondary
    if (viewCacheOptions?.ttl !== undefined && viewCacheOptions.ttl > 0) {
        return viewCacheOptions.ttl;
    }

    // Default TTL
    return STATISTICS_CACHE_CONFIG.DEFAULT_TTL;
}
