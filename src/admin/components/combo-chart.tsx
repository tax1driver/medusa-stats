import { useMemo } from "react"
import { Tooltip as UITooltip } from "@medusajs/ui"
import type { LegendPayload } from "recharts"
import type {
    StatisticsOption,
    SeriesVisualizationConfig,
    ChartVisualizationConfig,
    AvailableStatistic,
} from "../lib/statistics/api"
import { ChartRenderer } from "./chart-renderer"
import type { ChartDataPoint, SeriesConfig } from "./chart-renderer"



type StatsChartProps = {
    statistics: Array<
        Partial<StatisticsOption> & {
            result?: any
            definition?: AvailableStatistic
        }
    >
    chartConfig?: ChartVisualizationConfig | null
    interval: number
}



function renderChartLegend(
    statistics: Array<StatisticsOption & { result?: any }>,
) {
    return ({ payload }: { payload?: readonly LegendPayload[] }) => {
        if (!payload) return null

        return (
            <div className="flex flex-wrap gap-1 pt-2">
                {payload.map((entry) => {
                    const matchingStat = statistics.find(
                        (s) => s.local_option_name === entry.value,
                    )
                    const parameters = matchingStat?.data || {}
                    const tooltipContent = (
                        <div className="space-y-1">
                            <div className="font-medium">{entry.value}</div>
                            <div className="text-xs opacity-90 whitespace-pre-line">
                                {Object.entries(parameters)
                                    .map(([key, value]) => {
                                        const formattedKey = key
                                            .replace(/_/g, " ")
                                            .replace(/\b\w/g, (l) =>
                                                l.toUpperCase(),
                                            )
                                        const formattedValue =
                                            typeof value === "object"
                                                ? JSON.stringify(value)
                                                : String(value)
                                        return `${formattedKey}: ${formattedValue}`
                                    })
                                    .join("\n")}
                            </div>
                        </div>
                    )

                    return (
                        <UITooltip
                            key={entry.value}
                            content={tooltipContent}
                        >
                            <span className="txt-compact-xsmall-plus bg-ui-bg-subtle text-ui-fg-subtle border-ui-border-base box-border flex w-fit select-none items-center overflow-hidden rounded-md border pl-0 pr-1 leading-none">
                                <div
                                    role="presentation"
                                    className="flex items-center justify-center w-5 h-[18px] [&_div]:w-2 [&_div]:h-2 [&_div]:rounded-sm"
                                >
                                    <div
                                        style={{
                                            backgroundColor: entry.color,
                                        }}
                                    />
                                </div>
                                {entry.value}
                            </span>
                        </UITooltip>
                    )
                })}
            </div>
        )
    }
}



const tryParseDate = (value: any): Date | null => {
    if (value instanceof Date) return value
    if (typeof value === "string" || typeof value === "number") {
        const d = new Date(value)
        if (!isNaN(d.getTime())) return d
    }
    return null
}



export const StatsChart = ({
    statistics,
    chartConfig,
    interval,
}: StatsChartProps) => {


    const mergedData: ChartDataPoint[] = useMemo(() => {
        const dataMap = new Map<string, ChartDataPoint>()

        statistics.forEach((stat) => {
            const visConfig = stat.visualization_config as
                | SeriesVisualizationConfig
                | undefined
            if (visConfig?.visible === false) return
            if (!stat.result || !Array.isArray(stat.result.value)) return

            const seriesKey = stat.local_option_name
            if (!seriesKey) return

            stat.result.value.forEach((point: any) => {
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
    }, [statistics])



    const seriesConfigs: SeriesConfig[] = useMemo(() => {
        return statistics
            .filter((stat) => {
                const visConfig = stat.visualization_config as
                    | SeriesVisualizationConfig
                    | undefined
                return visConfig?.visible !== false
            })
            .map((stat) => {
                const visConfig = (stat.visualization_config ||
                    {}) as SeriesVisualizationConfig
                return {
                    key: stat.local_option_name || "",
                    name: visConfig.label || stat.local_option_name || "",
                    chartType: visConfig.chartType,
                    color: visConfig.color,
                    visible: visConfig.visible,
                    extra: {
                        seriesType: visConfig.seriesType,
                        lineStyle: visConfig.lineStyle,
                        lineWidth: visConfig.lineWidth,
                        showMarkers: visConfig.showMarkers,
                        fillOpacity: visConfig.fillOpacity,
                        pageSize: visConfig.pageSize,
                        aggregate: visConfig.aggregate,
                    },
                }
            })
    }, [statistics])



    const rendererConfig = useMemo(() => {
        if (!chartConfig) return null
        return {
            showLegend: chartConfig.showLegend,
            showGrid: chartConfig.showGrid,
            showTooltip: chartConfig.showTooltip,
            xAxis: chartConfig.xAxis?.label
                ? { label: chartConfig.xAxis.label }
                : undefined,
            yAxis: chartConfig.yAxis?.label
                ? { label: chartConfig.yAxis.label }
                : undefined,
            extra: {
                xAxis: chartConfig.xAxis,
                yAxis: chartConfig.yAxis,
                gridStyle: chartConfig.gridStyle,
                tooltipFormat: chartConfig.tooltipFormat,
                backgroundColor: chartConfig.backgroundColor,
                fontFamily: chartConfig.fontFamily,
            },
        }
    }, [chartConfig])



    return (
        <ChartRenderer
            data={mergedData}
            series={seriesConfigs}
            config={rendererConfig}
            interval={interval}
            renderLegend={renderChartLegend(
                statistics as Array<StatisticsOption & { result?: any }>,
            )}
        />
    )
}

export { StatsChart as ComboChart }
