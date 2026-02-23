import { z } from "zod";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";


export type ParameterFieldType =
    | "text"
    | "number"
    | "select"
    | "multiselect"
    | "boolean"
    | "date"
    | "daterange"
    | "currency"
    | "json"
    | "entity"
    | "entities"
    | "custom"
    | "stat";

export interface EntityReference {
    entity: string;
}

export interface ParameterFieldDefinition {
    name: string;
    label: string;
    description?: string;
    placeholder?: string;


    schema?: z.ZodType<any>;

    fieldType: ParameterFieldType;


    options?: Array<{
        value: string | number | boolean;
        label: string;
        description?: string;
        disabled?: boolean;
    }> | ((context: Record<string, any>) => Promise<Array<any>> | Array<any>);


    entityReference?: EntityReference;


    dependsOn?: Array<{
        field: string;
        condition: (value: any, allValues: Record<string, any>) => boolean;
        effect?: "show" | "hide" | "enable" | "disable" | "require";
    }>;
}

export interface AvailableStatistic {
    id: string;
    name: string;
    description?: string;

    parameters: {
        fields: ParameterFieldDefinition[];
        defaults?: Record<string, any>;
    };


    display: {

        visualization?: {
            preferredChartType?: "line" | "bar" | "area" | "pie" | "gauge" | "number" | string;
            xAxisType?: "time" | "category";
            [key: string]: any;
        };
    };

    metadata?: Record<string, any>;
}

export interface CalculateStatisticInput {
    id: string;
    parameters: Record<string, any>;
    fields: ParameterFieldDefinition[];
    periodStart: Date;
    periodEnd: Date;
    interval: number;
    metadata?: Record<string, any>;
}

export type TimeSeries = Array<{ x: Date; value: any }>;
export type CategoricalSeries = Array<{ x: string | number; value: any }>;
export type GaugeValue = { value: number };

export interface StatisticResult {
    value: TimeSeries | CategoricalSeries | GaugeValue | any;


    metadata?: Record<string, any>;
}

/**
 * Builder class for constructing AvailableStatistic objects with a fluent API.
 * 
 * @example
 * const statistic = new StatBuilder("total_revenue", "Total Revenue")
 *   .description("Calculate total revenue for the period")
 *   .field({
 *     name: "currency_code",
 *     label: "Currency",
 *     fieldType: "select",
 *     options: [{ value: "usd", label: "USD" }]
 *   })
 *   .chart("line")
 *   .dimension("time")
 *   .build();
 */
export class StatBuilder {
    private statistic: AvailableStatistic;

    constructor(id: string, name: string) {
        this.statistic = {
            id,
            name,
            parameters: {
                fields: []
            },
            display: {}
        };
    }

    /**
     * Set the description for this statistic
     */
    description(description: string): this {
        this.statistic.description = description;
        return this;
    }

    /**
     * Add a single parameter field to this statistic
     */
    field(field: ParameterFieldDefinition, defaultValue?: any): this {
        this.statistic.parameters.fields.push(field);

        if (defaultValue !== undefined) {
            if (!this.statistic.parameters.defaults) {
                this.statistic.parameters.defaults = {};
            }
            this.statistic.parameters.defaults[field.name] = defaultValue;
        }

        return this;
    }


    /**
     * Set the preferred chart type for visualization
     */
    chart(chartType: "line" | "bar" | "area" | "pie" | "gauge" | "number" | string): this {
        if (!this.statistic.display.visualization) {
            this.statistic.display.visualization = {};
        }
        this.statistic.display.visualization.preferredChartType = chartType;
        return this;
    }

    /**
     * Set the X-axis type for time series or categorical data
     */
    dimension(type: "time" | "category"): this {
        if (!this.statistic.display.visualization) {
            this.statistic.display.visualization = {};
        }
        this.statistic.display.visualization.xAxisType = type;
        return this;
    }

    /**
     * Set visualization configuration (merges with existing config)
     */
    visualization(config: Partial<AvailableStatistic['display']['visualization']>): this {
        this.statistic.display.visualization = {
            ...this.statistic.display.visualization,
            ...config
        };
        return this;
    }

    /**
     * Set metadata for this statistic
     */
    metadata(metadata: Record<string, any>): this {
        this.statistic.metadata = metadata;
        return this;
    }

    /**
     * Build and return the final AvailableStatistic object
     */
    build(): AvailableStatistic {

        if (!this.statistic.id || !this.statistic.name) {
            throw new Error("AvailableStatistic requires 'id' and 'name'");
        }

        return { ...this.statistic };
    }
}

/**
 * Helper: Group an array of data by a property or function result
 * 
 * @param data - Array of data items to group
 * @param keySelector - Property name or function to extract grouping key
 * @param aggregator - Optional function to aggregate grouped values
 * @returns Map of grouped data
 * 
 * @example
 * 
 * const byDate = groupBy(orders, 'created_at')
 * 
 * @example
 * 
 * const revenueByDay = groupBy(
 *   orders,
 *   (order) => order.created_at.toISOString().split('T')[0],
 *   (items) => items.reduce((sum, item) => sum + item.total, 0)
 * )
 */
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

        if (!groups.has(key)) {
            groups.set(key, []);
        }
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

/**
 * Helper: Generate interval timestamps for a period
 * 
 * @param periodStart - Start date of the period
 * @param periodEnd - End date of the period
 * @param interval - Interval in seconds (3600 = hourly, 86400 = daily, 604800 = weekly)
 * @returns Array of timestamps at each interval
 * 
 * @example
 * const intervals = generateIntervals(
 *   new Date('2024-01-01'),
 *   new Date('2024-01-31'),
 *   604800 
 * )
 */
export function generateIntervals(
    periodStart: Date,
    periodEnd: Date,
    interval: number
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

/**
 * Helper: Get the interval bucket for a given date
 * 
 * @param date - Date to bucket
 * @param periodStart - Start of the period
 * @param interval - Interval in seconds
 * @returns The bucket date (start of interval)
 * 
 * @example
 * const bucketDate = getIntervalBucket(
 *   new Date('2024-01-05'),
 *   new Date('2024-01-01'),
 *   604800 
 * )
 */
export function getIntervalBucket(
    date: Date,
    periodStart: Date,
    interval: number
): Date {
    const msSinceStart = date.getTime() - periodStart.getTime();
    const secondsSinceStart = Math.floor(msSinceStart / 1000);
    const bucketIndex = Math.floor(secondsSinceStart / interval);
    const bucketDate = new Date(periodStart);
    bucketDate.setTime(bucketDate.getTime() + bucketIndex * interval * 1000);
    return bucketDate;
}

/**
 * Creates a time series by efficiently mapping data to time intervals.
 * Generates intervals internally and processes data in a single pass.
 * 
 * @param data - Array of data items to aggregate
 * @param periodStart - Start of the time period
 * @param periodEnd - End of the time period
 * @param intervalSeconds - Duration of each interval in seconds
 * @param accumulator - Function to aggregate items within each interval
 * @param options - Optional configuration
 * @param options.timestampField - Field name or function to extract timestamp (defaults to 'created_at')
 * @returns Array of time series points with x (Date) and value (number)
 */
export function createTimeSeries<T extends Record<string, any>>(
    data: T[],
    periodStart: Date,
    periodEnd: Date,
    intervalSeconds: number,
    accumulator: (items: T[]) => number,
    options: {
        timestampField?: string | ((item: T) => number);
    } = {}
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

        result.push({
            x: new Date(currentMs),
            value: accumulator(itemsInInterval)
        });
    }

    return result;
}

/**
 * Creates a count accumulator that returns the number of items.
 * 
 * @returns Accumulator function that counts items
 * 
 * @example
 * createTimeSeries(orders, start, end, interval, count())
 */
export function count<T>() {
    return (items: T[]) => items.length;
}

/**
 * Creates a sum accumulator that sums values of a specific field.
 * 
 * @param field - Name of the field to sum
 * @returns Accumulator function that sums field values
 * 
 * @example
 * createTimeSeries(orders, start, end, interval, sum('total'))
 */
export function sum<T extends Record<string, any>>(field: string) {
    return (items: T[]) => items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
}

/**
 * Creates an average accumulator that calculates mean of a specific field.
 * Optionally excludes outliers using IQR method (requires at least 3 data points).
 * 
 * @param field - Name of the field to average
 * @param options - Optional configuration
 * @param options.excludeOutliers - If true, excludes outliers using IQR method
 * @returns Accumulator function that calculates average
 * 
 * @example
 * createTimeSeries(orders, start, end, interval, average('total'))
 * createTimeSeries(orders, start, end, interval, average('total', { excludeOutliers: true }))
 */
export function average<T extends Record<string, any>>(
    field: string,
    options: { excludeOutliers?: boolean } = {}
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
            return filtered.reduce((sum, v) => sum + v, 0) / filtered.length;
        }

        return values.reduce((sum, v) => sum + v, 0) / values.length;
    };
}


/**
 * Abstract provider for calculating statistics.
 * Extend this class to implement custom statistics providers.
 */
export abstract class AbstractStatisticsProvider {
    static identifier: string;
    static displayName: string;
    protected query: any;

    constructor(protected readonly container: any) {

        this.query = container[ContainerRegistrationKeys.QUERY];
    }

    /**
     * Get available statistics for a given sales channel.
     * 
     * @param input - Input parameters
     * @param input.sales_channel_id - Optional sales channel ID to filter statistics
     * @returns Array of available statistics with their configuration
     */
    abstract getAvailableStatistics(): Promise<AvailableStatistic[]> | AvailableStatistic[];

    /**
     * Calculate a specific statistic for a given period.
     * 
     * @param input - Input parameters
     * @param input.id - The statistic ID to calculate
     * @param input.parameters - Validated and merged parameter values
     * @param input.fields - Field definitions for reference
     * @param input.periodStart - Start date of the period
     * @param input.periodEnd - End date of the period
     * @param input.interval - Interval in seconds (3600 = hourly, 86400 = daily, 604800 = weekly)
     * @param input.metadata - Additional calculation metadata
     * @returns The calculated statistic with rendering configuration
     */
    abstract calculateStatistic(
        input: CalculateStatisticInput
    ): Promise<StatisticResult> | StatisticResult;
}

