import { Query } from "@medusajs/framework";
import { StatCalculationInput } from "../provider";

export function groupBy<T, K extends string | number = string>(
    data: T[],
    keySelector: keyof T | ((item: T) => K),
    aggregator?: (items: T[], key: K) => any
): Map<K, any> {
    const groups = new Map<K, T[]>();
    for (const item of data) {
        const key = typeof keySelector === 'function'
            ? keySelector(item)
            : (item[keySelector] as unknown as K);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
    }
    if (aggregator) {
        const result = new Map<K, any>();
        for (const [key, items] of groups.entries()) {
            result.set(key, aggregator(items, key));
        }
        return result;
    }
    return groups as Map<K, any>;
}

export function generateIntervals(
    periodStart: Date, periodEnd: Date, interval: number
): Date[] {
    const intervals: Date[] = [];
    const current = new Date(periodStart);
    const end = new Date(periodEnd);
    const intervalMs = interval * 1000;
    while (current <= end) {
        intervals.push(new Date(current));
        current.setTime(current.getTime() + intervalMs);
    }
    return intervals;
}

export function getIntervalBucket(date: Date, periodStart: Date, interval: number): Date {
    const msSinceStart = date.getTime() - periodStart.getTime();
    const secondsSinceStart = Math.floor(msSinceStart / 1000);
    const bucketIndex = Math.floor(secondsSinceStart / interval);
    const bucketDate = new Date(periodStart);
    bucketDate.setTime(bucketDate.getTime() + bucketIndex * interval * 1000);
    return bucketDate;
}

export async function createQueryTimeSeries<T extends Record<string, any>>(
    query: Query,
    input: { periodStart: Date; periodEnd: Date; interval: number },
    queryParams: Parameters<Query["graph"]>[0],
    accumulator: (items: T[]) => number,
    options: { timestampField?: string | ((item: T) => number); } = {}
): Promise<Array<{ x: Date; value: number }>> {
    const { data } = await query.graph({
        ...queryParams,
        filters: {
            ...queryParams.filters,
            created_at: {
                $gte: input.periodStart,
                $lte: input.periodEnd,
            },
        }
    })

    return createTimeSeries(data, input.periodStart, input.periodEnd, input.interval, accumulator, options);
}

export function createTimeSeries<T extends Record<string, any>>(
    data: T[], periodStart: Date, periodEnd: Date, intervalSeconds: number,
    accumulator: (items: T[]) => number,
    options: { timestampField?: string | ((item: T) => number); } = {}
): Array<{ x: Date; value: number }> {
    let getTimestamp: (item: T) => number;
    if (typeof options.timestampField === 'function') {
        getTimestamp = options.timestampField;
    } else {
        const field = options.timestampField || 'created_at';
        getTimestamp = (item: T) => new Date(item[field]).getTime();
    }
    const sorted = [...data]
        .map(item => ({ item, timestamp: getTimestamp(item) }))
        .sort((a, b) => a.timestamp - b.timestamp);
    const result: Array<{ x: Date; value: number }> = [];
    const startMs = periodStart.getTime();
    const endMs = periodEnd.getTime();
    const intervalMs = intervalSeconds * 1000;
    let dataIdx = 0;
    for (let currentMs = startMs; currentMs < endMs; currentMs += intervalMs) {
        const nextMs = Math.min(currentMs + intervalMs, endMs);
        const itemsInInterval: T[] = [];
        const startIdx = dataIdx;
        while (dataIdx < sorted.length && sorted[dataIdx].timestamp < nextMs) {
            if (sorted[dataIdx].timestamp >= currentMs) {
                itemsInInterval.push(sorted[dataIdx].item);
            }
            dataIdx++;
        }
        dataIdx = startIdx;
        result.push({ x: new Date(currentMs), value: accumulator(itemsInInterval) });
    }
    return result;
}

export function count<T>() {
    return (items: T[]) => items.length;
}

export function sum<T extends Record<string, any>>(field: string) {
    return (items: T[]) => items.reduce((s, item) => s + (Number(item[field]) || 0), 0);
}

export function average<T extends Record<string, any>>(
    field: string, options: { excludeOutliers?: boolean } = {}
) {
    return (items: T[]) => {
        if (items.length === 0) return 0;
        const values = items.map(item => Number(item[field]) || 0);
        if (options.excludeOutliers && values.length > 2) {
            const sorted = [...values].sort((a, b) => a - b);
            const q1 = sorted[Math.floor(sorted.length * 0.25)];
            const q3 = sorted[Math.floor(sorted.length * 0.75)];
            const iqr = q3 - q1;
            const filtered = values.filter(v => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
            return filtered.reduce((s, v) => s + v, 0) / filtered.length;
        }
        return values.reduce((s, v) => s + v, 0) / values.length;
    };
}
