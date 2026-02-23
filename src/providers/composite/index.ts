import { MedusaError, ModuleProvider } from "@medusajs/framework/utils";
import { AbstractStatisticsProvider, AvailableStatistic, CalculateStatisticInput, StatisticResult, StatBuilder } from "medusa-stats";
import { z } from "zod";

class CompositeStatisticsProvider extends AbstractStatisticsProvider {
    static identifier = "composite-statistics";
    static displayName = "Composite Statistics Provider";

    async getAvailableStatistics(): Promise<AvailableStatistic[]> {
        return [
            new StatBuilder("moving_average", "Moving Average")
                .description("Smooth a time series by averaging values over a rolling window.")
                .field({
                    name: "input_series",
                    label: "Input Series",
                    description: "Dependency result to analyze.",
                    schema: z.array(z.object({
                        x: z.union([z.string(), z.date(), z.number()]),
                        value: z.number()
                    })).default([]),
                    fieldType: "stat"
                }, [])
                .field({
                    name: "window_size",
                    label: "Window Size",
                    description: "Number of points in each rolling average window.",
                    schema: z.number().int().min(2).max(365).default(7),
                    fieldType: "number"
                }, 7)
                .chart("line")
                .dimension("time")
                .build(),
            new StatBuilder("rate_of_change", "Rate of Change")
                .description("Measures momentum as change versus N periods ago.")
                .field({
                    name: "input_series",
                    label: "Input Series",
                    description: "Dependency result to analyze.",
                    schema: z.array(z.object({
                        x: z.union([z.string(), z.date(), z.number()]),
                        value: z.number()
                    })).default([]),
                    fieldType: "stat"
                }, [])
                .field({
                    name: "periods",
                    label: "Lookback Periods",
                    description: "Compare each point against the value this many points back.",
                    schema: z.number().int().min(1).max(365).default(1),
                    fieldType: "number"
                }, 1)
                .field({
                    name: "as_percentage",
                    label: "As Percentage",
                    description: "Return percent change (true) or decimal ratio (false).",
                    schema: z.boolean().default(true),
                    fieldType: "boolean"
                }, true)
                .chart("line")
                .dimension("time")
                .build()
        ]
    }

    async calculateStatistic(input: CalculateStatisticInput): Promise<StatisticResult> {
        const { id, parameters } = input

        const inputSeries = normalizeSeries(parameters.input_series);

        if (inputSeries.length === 0) {
            throw new MedusaError(
                MedusaError.Types.INVALID_ARGUMENT,
                `${id} requires dependency input. Add an input dependency and map parameter_name to 'input_series'.`
            )
        }

        switch (id) {
            case "moving_average": {
                const windowSize = Number(parameters.window_size || 7)
                const values = inputSeries.map((point) => point.value)

                const movingAverage = inputSeries.map((point, index) => {
                    const start = Math.max(0, index - windowSize + 1)
                    const window = values.slice(start, index + 1)
                    const avg = window.reduce((sum, value) => sum + value, 0) / window.length

                    return {
                        x: point.x,
                        value: Number(avg.toFixed(6))
                    }
                })

                return {
                    value: movingAverage,
                    metadata: {
                        points: movingAverage.length,
                        windowSize,
                        calculatedAt: new Date()
                    }
                }
            }

            case "rate_of_change": {
                const periods = Number(parameters.periods || 1)
                const asPercentage = parameters.as_percentage !== false

                const roc = inputSeries.map((point, index) => {
                    if (index < periods) {
                        return { x: point.x, value: 0 }
                    }

                    const previous = inputSeries[index - periods].value
                    if (previous === 0) {
                        return { x: point.x, value: 0 }
                    }

                    const change = (point.value - previous) / Math.abs(previous)
                    const value = asPercentage ? change * 100 : change

                    return {
                        x: point.x,
                        value: Number(value.toFixed(6))
                    }
                })

                return {
                    value: roc,
                    metadata: {
                        points: roc.length,
                        periods,
                        asPercentage,
                        calculatedAt: new Date()
                    }
                }
            }

            default:
                throw new MedusaError(
                    MedusaError.Types.INVALID_ARGUMENT,
                    `Unknown statistic: ${id}`
                )
        }
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
