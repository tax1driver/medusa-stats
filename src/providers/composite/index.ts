import { MedusaError, ModuleProvider } from "@medusajs/framework/utils";
import { AbstractStatisticsProvider, StatFn, StatCalculationInput, StatisticResult } from "medusa-stats";
import { z } from "zod";


export const timeSeriesSchema = z.object({
    value: z.array(z.object({
        x: z.union([z.string(), z.date(), z.number()]),
        value: z.number(),
    }))
});

const movingAverageSchema = z.object({
    input_series: timeSeriesSchema.meta({ type: "stat" }),
    window_size: z.number().int().min(2).max(365).default(7),
});

const rateOfChangeSchema = z.object({
    input_series: timeSeriesSchema.meta({ type: "stat" }),
    periods: z.number().int().min(1).max(365).default(1),
    as_percentage: z.boolean().default(true),
});

class CompositeStatisticsProvider extends AbstractStatisticsProvider {
    static identifier = "composite-statistics";

    @StatFn("moving_average", {
        schema: movingAverageSchema,
        dimension: "time",
    })
    async movingAverage({ parameters }: StatCalculationInput): Promise<StatisticResult> {
        const inputSeries = normalizeSeries(parameters.input_series.value);

        if (inputSeries.length === 0) {
            throw new MedusaError(
                MedusaError.Types.INVALID_ARGUMENT,
                "moving_average requires dependency input. Add an input dependency and map parameter_name to 'input_series'."
            );
        }

        const windowSize = Number(parameters.window_size);
        const values = inputSeries.map((point) => point.value);

        const movingAverage = inputSeries.map((point, index) => {
            const start = Math.max(0, index - windowSize + 1);
            const window = values.slice(start, index + 1);
            const avg = window.reduce((sum, value) => sum + value, 0) / window.length;

            return {
                x: point.x,
                value: Number(avg.toFixed(6)),
            };
        });

        return {
            value: movingAverage,
        };
    }

    @StatFn("rate_of_change", {
        schema: rateOfChangeSchema,
        dimension: "time",
    })
    async rateOfChange({ parameters }: StatCalculationInput): Promise<StatisticResult> {
        const inputSeries = normalizeSeries(parameters.input_series.value);

        if (inputSeries.length === 0) {
            throw new MedusaError(
                MedusaError.Types.INVALID_ARGUMENT,
                "rate_of_change requires dependency input. Add an input dependency and map parameter_name to 'input_series'."
            );
        }

        const periods = Number(parameters.periods);
        const asPercentage = parameters.as_percentage;

        const roc = inputSeries.map((point, index) => {
            if (index < periods) {
                return { x: point.x, value: 0 };
            }

            const previous = inputSeries[index - periods].value;
            if (previous === 0) {
                return { x: point.x, value: 0 };
            }

            const change = (point.value - previous) / Math.abs(previous);
            const value = asPercentage ? change * 100 : change;

            return {
                x: point.x,
                value: Number(value.toFixed(6)),
            };
        });

        return {
            value: roc,
        };
    }
}

const normalizeSeries = (rawSeries: any): Array<{ x: Date; value: number }> => {
    if (!Array.isArray(rawSeries)) {
        return []
    }

    return rawSeries
        .map((point: any) => {
            const value = Number(point?.value)
            if (!Number.isFinite(value)) {
                return null
            }

            const x = point?.x instanceof Date ? point.x : new Date(point?.x)
            if (Number.isNaN(x.getTime())) {
                return null
            }

            return { x, value }
        })
        .filter((point): point is { x: Date; value: number } => Boolean(point))
        .sort((a, b) => a.x.getTime() - b.x.getTime())
}

export default ModuleProvider("statistics", {
    services: [CompositeStatisticsProvider]
})
