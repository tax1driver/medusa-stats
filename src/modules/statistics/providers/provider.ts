import { z } from "zod";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { extractFieldsFromZodSchema } from "./utils/zod-field-extractor";
import { Query } from "@medusajs/framework";

const STAT_METADATA_KEY = Symbol("stat:definitions");

interface StatDefinition {
    id: string;
    propertyKey: string;
    options: StatOptions;
}
export interface StatOptions {
    schema: z.ZodObject<any>;
    chart?: string;
    dimension?: "time" | "category";
    metadata?: Record<string, any>;
}
export interface StatCalculationInput {
    parameters: Record<string, any>;
    periodStart: Date;
    periodEnd: Date;
    interval: number;  // seconds
}
export interface CalculateInput {
    id: string;
    parameters: Record<string, any>;
    periodStart: Date;
    periodEnd: Date;
    interval: number;
}

export interface AvailableStatistic {
    id: string;
    parameters: Array<{
        name: string;
        type: string;
        metadata: Record<string, any>;
    }>;
    metadata?: Record<string, any>;
}

export type TimeSeries = Array<{ x: Date; value: any }>;
export type CategoricalSeries = Array<{ x: string | number; value: any }>;
export type GaugeValue = { value: number };

export interface StatisticResult {
    value: TimeSeries | CategoricalSeries | GaugeValue | any;
    metadata?: Record<string, any>;
}

export function StatFn(id: string, options: StatOptions): MethodDecorator {
    return function (
        _target: Object,
        propertyKey: string | symbol,
        _descriptor: PropertyDescriptor
    ) {
        const existing: StatDefinition[] =
            (Reflect as any).getMetadata(STAT_METADATA_KEY, _target) || [];
        existing.push({ id, propertyKey: propertyKey as string, options });
        (Reflect as any).defineMetadata(STAT_METADATA_KEY, existing, _target);
    };
}

export abstract class AbstractStatisticsProvider {
    static identifier: string;
    protected query: Query;

    constructor(protected readonly container: any) {
        this.query = container[ContainerRegistrationKeys.QUERY];
    }

    listStatistics(): AvailableStatistic[] {
        const defs = this._collectStatDefinitions();
        return defs.map(d => ({
            id: d.id,
            parameters: extractFieldsFromZodSchema(d.options.schema),
            metadata: {
                ...(d.options.chart ? { chart: d.options.chart } : {}),
                ...(d.options.dimension ? { dimension: d.options.dimension } : {}),
                ...d.options.metadata,
            },
        }));
    }

    validateParameters(id: string, params: Record<string, any>, partial = false): Record<string, any> {
        const defs = this._collectStatDefinitions();
        const def = defs.find(d => d.id === id);

        if (!def) {
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                `Statistic "${id}" not found in provider "${(this.constructor as typeof AbstractStatisticsProvider).identifier}"`
            );
        }

        const schema = partial ? def.options.schema.partial() : def.options.schema;
        return schema.parse(params);
    }

    async calculate(input: CalculateInput): Promise<StatisticResult> {
        const defs = this._collectStatDefinitions();
        const def = defs.find(d => d.id === input.id);

        if (!def) {
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                `Statistic "${input.id}" not found in provider "${(this.constructor as typeof AbstractStatisticsProvider).identifier}"`
            );
        }

        const validatedParams = def.options.schema.parse(input.parameters);

        return (this as any)[def.propertyKey]({
            parameters: validatedParams,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            interval: input.interval,
        });
    }
    private _collectStatDefinitions(): StatDefinition[] {
        const defs: StatDefinition[] = [];
        let proto = Object.getPrototypeOf(this);

        while (proto && proto !== Object.prototype) {
            const meta = (Reflect as any).getMetadata(STAT_METADATA_KEY, proto);
            if (meta) defs.push(...meta);
            proto = Object.getPrototypeOf(proto);
        }

        return defs;
    }
}
