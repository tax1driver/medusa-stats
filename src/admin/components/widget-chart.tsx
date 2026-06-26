import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChartRenderer } from "./chart-renderer"
import { calculateStatistics } from "../lib/statistics/api"
import type {
    ChartDataPoint,
    SeriesConfig,
    ChartRendererConfig,
} from "./chart-renderer"



export type WidgetChartOption = {
    provider: string
    key: string
    period: {
        start: string
        end: string
        interval: number
    }
    name?: string
    chartType?: string
    color?: string
    params?: Record<string, any>
    extra?: Record<string, any>
}

export type WidgetChartProps = {
    options: WidgetChartOption[]
    name?: string
    chartConfig?: ChartRendererConfig | null
}



const tryParseDate = (value: any): Date | null => {
    if (value instanceof Date) return value
    if (typeof value === "string" || typeof value === "number") {
        const d = new Date(value)
        if (!isNaN(d.getTime())) return d
    }
    return null
}



export const WidgetChart = ({
    options,
    name,
    chartConfig,
}: WidgetChartProps) => {
    const primary = options[0]
    const periodStart = primary?.period.start
    const periodEnd = primary?.period.end
    const interval = primary?.period.interval ?? 86400

    const queryKey = [
        "widget-chart",
        name,
        ...options.flatMap((o) => [
            o.provider,
            o.key,
            o.period.start,
            o.period.end,
            o.period.interval,
            o.params,
        ]),
    ]

    const { data: result, isLoading, error } = useQuery({
        queryKey,
        queryFn: () =>
            calculateStatistics({
                statistics: options.map((o) => ({
                    provider_id: o.provider,
                    key: o.key,
                    params: o.params,
                })),
                periodStart,
                periodEnd,
                interval,
            }),
        enabled: options.length > 0,
    })



    const mergedData: ChartDataPoint[] = useMemo(() => {
        if (!result?.results) return []

        const dataMap = new Map<string, ChartDataPoint>()

        options.forEach((opt) => {
            const raw = result.results[opt.key]
            if (raw?.error) return
            const value = raw?.value
            if (!Array.isArray(value)) return

            const seriesKey = opt.name || opt.key

            value.forEach((point: any) => {
                const key = String(point.x)
                if (!dataMap.has(key)) {
                    dataMap.set(key, { x: point.x })
                }
                dataMap.get(key)![seriesKey] = point.value
            })
        })

        return Array.from(dataMap.values()).sort((a, b) => {
            if (typeof a.x === "number" && typeof b.x === "number") {
                return a.x - b.x
            }

            if (typeof a.x === "string" && typeof b.x === "string") {
                const isTimeAxis =
                    tryParseDate(a.x) !== null &&
                    tryParseDate(b.x) !== null

                if (isTimeAxis) {
                    const dateA = new Date(a.x)
                    const dateB = new Date(b.x)

                    if (
                        !isNaN(dateA.getTime()) &&
                        !isNaN(dateB.getTime())
                    ) {
                        return dateA.getTime() - dateB.getTime()
                    }
                }

                return a.x.localeCompare(b.x)
            }

            return String(a.x).localeCompare(String(b.x))
        })
    }, [result, options])



    const seriesConfigs: SeriesConfig[] = useMemo(
        () =>
            options.map((opt) => ({
                key: opt.name || opt.key,
                name: opt.name || opt.key,
                chartType: opt.chartType || "2d",
                color: opt.color,
                visible: true,
                extra: opt.extra || {},
            })),
        [options],
    )



    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="text-ui-fg-muted">Loading…</div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="text-center py-8 text-ui-fg-error">
                {(error as Error)?.message || "Failed to load"}
            </div>
        )
    }

    if (!result?.results || mergedData.length === 0) {
        return (
            <div className="text-center py-8 text-ui-fg-muted">
                No data available
            </div>
        )
    }

    return (
        <ChartRenderer
            data={mergedData}
            series={seriesConfigs}
            config={chartConfig}
            interval={interval}
        />
    )
}
