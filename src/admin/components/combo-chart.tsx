import { useMemo } from "react"
import {
    ComposedChart,
    Line,
    Bar,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LegendPayload,
} from "recharts"
import { Tooltip as UITooltip, Text } from "@medusajs/ui"
import type { StatisticsOption, SeriesVisualizationConfig, ChartVisualizationConfig, AvailableStatistic } from "../lib/statistics/api"

type ComboChartProps = {
    statistics: Array<StatisticsOption & { result?: any, definition?: AvailableStatistic }>
    chartConfig?: ChartVisualizationConfig | null
    interval: number
}

const chartStyles = {
    grid: {
        strokeDasharray: "3 3",
        strokeWidth: "1",
        stroke: "var(--border-base)"
    },
    axis: {
        stroke: "var(--fg-muted)",
        style: { fontSize: "12px" }
    },
    tooltip: {
        contentStyle: {
            backgroundColor: "var(--bg-component)",
            border: "1px solid var(--border-base)",
            borderRadius: "6px"
        },
        cursor: {
            fill: "var(--bg-interactive)",
            fillOpacity: 0.1
        }

    },
    line: {
        strokeWidth: 2,
        dot: { r: 3 },
        activeDot: { r: 5 }
    },
    bar: {
        radius: [4, 4, 0, 0]
    },
    area: {
        fillOpacity: 0.3
    },
    pie: {
        outerRadius: 80
    },
    legend: {
        verticalAlign: "bottom" as const,
        align: "left" as const,
    },
    defaultColor: "var(--fg-interactive)"  // Default chart color
}

const getTickFormatter = (intervalSeconds: number) => {
    // Format based on interval
    if (intervalSeconds >= 86400) { // >= 1 day
        return (value: any) => {
            const date = new Date(value)
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        }
    } else if (intervalSeconds >= 3600) { // >= 1 hour
        return (value: any) => {
            const date = new Date(value)
            return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        }
    } else { // < 1 hour
        return (value: any) => {
            const date = new Date(value)
            return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        }
    }
}

const CustomTooltip = ({
    active,
    payload,
    label,
    tickFormatter
}: {
    active?: boolean
    payload?: readonly {
        name?: string
        value?: any
        color?: string
        dataKey?: string | number
        payload?: any
    }[]
    label?: any
    tickFormatter?: (value: any) => string
}) => {
    if (!active || !payload || payload.length === 0) {
        return null
    }

    // Format the label based on whether it's time-based
    const formatLabel = (value: any) => {
        return tickFormatter ? tickFormatter(value) : String(value)
    }

    return (
        <div
            className="bg-ui-bg-component border border-ui-border-base rounded-md shadow-elevation-flyout p-3"
            style={{
                minWidth: '150px',
            }}
        >
            <Text size="small" weight="plus" className="text-ui-fg-base mb-2 pb-2 border-b border-ui-border-base">
                {formatLabel(label)}
            </Text>
            <div className="space-y-1.5">
                {payload.map((entry, index) => (
                    <div key={`item-${index}`} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: entry.color }}
                            />
                            <Text size="small" className="text-ui-fg-subtle">
                                {entry.name}
                            </Text>
                        </div>
                        <Text size="small" weight="plus" className="text-ui-fg-base">
                            {typeof entry.value === 'number'
                                ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                : entry.value
                            }
                        </Text>
                    </div>
                ))}
            </div>
        </div>
    )
}

function renderChartLegend(statistics: Array<StatisticsOption & { result?: any }>) {
    return ({ payload }: { payload?: readonly LegendPayload[] }) => {
        if (!payload) return null

        return (
            <div className="flex flex-wrap gap-1 pt-2">
                {payload.map((entry) => {
                    // Find the statistic that matches this legend entry
                    const matchingStat = statistics.find(s => s.local_option_name === entry.value)
                    const parameters = matchingStat?.data || {}
                    const tooltipContent = (
                        <div className="space-y-1">
                            <div className="font-medium">{entry.value}</div>
                            <div className="text-xs opacity-90 whitespace-pre-line">
                                {Object.entries(parameters)
                                    .map(([key, value]) => {
                                        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                                        const formattedValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
                                        return `${formattedKey}: ${formattedValue}`
                                    })
                                    .join('\n')
                                }
                            </div>
                        </div>
                    )

                    return (
                        <UITooltip key={entry.value} content={tooltipContent}>
                            <span className="txt-compact-xsmall-plus bg-ui-bg-subtle text-ui-fg-subtle border-ui-border-base box-border flex w-fit select-none items-center overflow-hidden rounded-md border pl-0 pr-1 leading-none">
                                <div role="presentation" className="flex items-center justify-center w-5 h-[18px] [&amp;_div]:w-2 [&amp;_div]:h-2 [&amp;_div]:rounded-sm">
                                    <div style={{ backgroundColor: entry.color }}>
                                    </div>
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


export const ComboChart = ({ statistics, chartConfig, interval }: ComboChartProps) => {
    const isTimeAxis = statistics.some(stat =>
        stat.definition?.display.visualization?.xAxisType === "time"
    );

    const mergedData = useMemo(() => {
        const dataMap = new Map<string, any>()

        statistics.forEach((stat) => {
            const config = stat.visualization_config as SeriesVisualizationConfig
            if (config?.visible === false) return
            if (!stat.result || !Array.isArray(stat.result.value)) return

            const seriesKey = stat.local_option_name

            stat.result.value.forEach((point: any) => {
                const key = String(point.x)
                if (!dataMap.has(key)) {
                    dataMap.set(key, { x: point.x })
                }
                dataMap.get(key)![seriesKey] = point.value
            })
        })

        return Array.from(dataMap.values()).sort((a, b) => {
            // Sort by x value - handle numbers, dates, and strings
            if (typeof a.x === 'number' && typeof b.x === 'number') {
                return a.x - b.x
            }

            if (typeof a.x === 'string' && typeof b.x === 'string') {
                // Only try parsing as dates if xAxisType is "time"
                if (isTimeAxis) {
                    const dateA = new Date(a.x)
                    const dateB = new Date(b.x)

                    // Check if both are valid dates
                    if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
                        return dateA.getTime() - dateB.getTime()
                    }
                }

                // Fall back to string comparison
                return a.x.localeCompare(b.x)
            }

            // Mixed types or other cases - convert to string for comparison
            return String(a.x).localeCompare(String(b.x))
        })
    }, [statistics])

    if (mergedData.length === 0) {
        return (
            <div className="text-center py-8 text-ui-fg-muted">
                No data available
            </div>
        )
    }

    const tickFormatter = isTimeAxis ? getTickFormatter(interval) : undefined;
    const showLegend = chartConfig?.showLegend ?? true
    const showGrid = chartConfig?.showGrid ?? true
    const scaleType = chartConfig?.yAxis?.scaleType || "linear"

    return (
        <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mergedData}>
                    {showGrid && <CartesianGrid {...chartStyles.grid} />}

                    <XAxis
                        dataKey="x"
                        tickFormatter={tickFormatter}
                        {...chartStyles.axis}
                        label={chartConfig?.xAxis?.label ? {
                            value: chartConfig.xAxis.label,
                            position: "insideBottom",
                            offset: -5
                        } : undefined}
                    />

                    <YAxis
                        scale={scaleType}
                        {...chartStyles.axis}
                        label={chartConfig?.yAxis?.label ? {
                            value: chartConfig.yAxis.label,
                            angle: -90,
                            position: "insideLeft"
                        } : undefined}
                    />

                    {chartConfig?.showTooltip !== false && (
                        <Tooltip
                            content={(props) => <CustomTooltip {...props} tickFormatter={tickFormatter} />}
                            cursor={chartStyles.tooltip.cursor}
                        />
                    )}

                    {showLegend && (
                        <Legend
                            {...chartStyles.legend}
                            content={renderChartLegend(statistics)}
                        />
                    )}

                    {/* Render each statistic as its configured chart type */}
                    {statistics.map((stat) => {
                        const config = stat.visualization_config as SeriesVisualizationConfig
                        if (config?.visible === false) return null
                        if (!stat.result || !Array.isArray(stat.result.value)) return null

                        const seriesKey = stat.local_option_name
                        const chartType = config?.chartType || "line"
                        const color = config?.color || chartStyles.defaultColor
                        const lineStyle = config?.lineStyle || "solid"
                        const lineWidth = config?.lineWidth || 2
                        const showMarkers = config?.showMarkers ?? true
                        const fillOpacity = config?.fillOpacity || 0.6

                        const strokeDasharray =
                            lineStyle === "dashed" ? "5 5" :
                                lineStyle === "dotted" ? "2 2" :
                                    undefined

                        if (chartType === "line") {
                            return (
                                <Line
                                    key={stat.id}
                                    dataKey={seriesKey}
                                    stroke={color}
                                    name={config?.label || seriesKey}
                                    {...chartStyles.line}
                                />
                            )
                        }

                        if (chartType === "bar") {
                            return (
                                <Bar
                                    key={stat.id}
                                    dataKey={seriesKey}
                                    fill={color}
                                    name={config?.label || seriesKey}
                                    radius={[4, 4, 0, 0]}
                                />
                            )
                        }

                        if (chartType === "area") {
                            return (
                                <Area
                                    key={stat.id}
                                    type="monotone"
                                    dataKey={seriesKey}
                                    stroke={color}
                                    fill={color}
                                    fillOpacity={fillOpacity}
                                    strokeWidth={lineWidth}
                                    name={config?.label || seriesKey}
                                />
                            )
                        }

                        return null
                    })}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    )
}
