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
} from "recharts"
import { Text } from "@medusajs/ui"
import { format, isValid, parseISO } from "date-fns"
import type { ChartRendererProps } from "./chart-renderer"



const chartStyles = {
    grid: {
        strokeDasharray: "3 3",
        strokeWidth: "1",
        stroke: "var(--border-base)",
    },
    axis: {
        stroke: "var(--fg-muted)",
        style: { fontSize: "12px" },
    },
    tooltip: {
        contentStyle: {
            backgroundColor: "var(--bg-component)",
            border: "1px solid var(--border-base)",
            borderRadius: "6px",
        },
        cursor: {
            fill: "var(--bg-interactive)",
            fillOpacity: 0.1,
        },
    },
    line: {
        strokeWidth: 2,
        dot: { r: 3 },
        activeDot: { r: 5 },
    },
    bar: {
        radius: [4, 4, 0, 0] as [number, number, number, number],
    },
    area: {
        fillOpacity: 0.3,
    },
    legend: {
        verticalAlign: "bottom" as const,
        align: "left" as const,
    },
    defaultColor: "var(--fg-interactive)",
}



const tryParseDate = (value: any): Date | null => {
    if (value instanceof Date) return value
    if (typeof value === "string") {
        const parsed = parseISO(value)
        if (isValid(parsed)) return parsed
    }
    if (typeof value === "number") {
        const d = new Date(value)
        if (isValid(d)) return d
    }
    return null
}

const getTickFormatter = (intervalSeconds: number) => {
    if (intervalSeconds >= 86400) {
        return (value: any) => {
            const date = tryParseDate(value)
            return date ? format(date, "MMM d") : String(value)
        }
    } else if (intervalSeconds >= 3600) {
        return (value: any) => {
            const date = tryParseDate(value)
            return date ? format(date, "HH:mm") : String(value)
        }
    } else {
        return (value: any) => {
            const date = tryParseDate(value)
            return date ? format(date, "HH:mm:ss") : String(value)
        }
    }
}



const CustomTooltip = ({
    active,
    payload,
    label,
    tickFormatter,
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

    const formatLabel = (value: any) => {
        return tickFormatter ? tickFormatter(value) : String(value)
    }

    return (
        <div
            className="bg-ui-bg-component border border-ui-border-base rounded-md shadow-elevation-flyout p-3"
            style={{ minWidth: "150px" }}
        >
            <Text
                size="small"
                weight="plus"
                className="text-ui-fg-base mb-2 pb-2 border-b border-ui-border-base"
            >
                {formatLabel(label)}
            </Text>
            <div className="space-y-1.5">
                {payload.map((entry, index) => (
                    <div
                        key={`item-${index}`}
                        className="flex items-center justify-between gap-3"
                    >
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
                            {typeof entry.value === "number"
                                ? entry.value.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                })
                                : entry.value}
                        </Text>
                    </div>
                ))}
            </div>
        </div>
    )
}



const DefaultLegend = ({
    payload,
}: {
    payload?: readonly { value?: string; color?: string }[]
}) => {
    if (!payload || payload.length === 0) return null

    return (
        <div className="flex flex-wrap gap-1 pt-2">
            {payload.map((entry) => (
                <span
                    key={entry.value}
                    className="txt-compact-xsmall-plus bg-ui-bg-subtle text-ui-fg-subtle border-ui-border-base box-border flex w-fit select-none items-center overflow-hidden rounded-md border pl-0 pr-1 leading-none"
                >
                    <div
                        role="presentation"
                        className="flex items-center justify-center w-5 h-[18px] [&_div]:w-2 [&_div]:h-2 [&_div]:rounded-sm"
                    >
                        <div style={{ backgroundColor: entry.color }} />
                    </div>
                    {entry.value}
                </span>
            ))}
        </div>
    )
}



export const RechartChart = ({
    data,
    series,
    config,
    interval,
    renderLegend,
}: ChartRendererProps) => {
    if (data.length === 0) {
        return (
            <div className="text-center py-8 text-ui-fg-muted">
                No data available
            </div>
        )
    }

    const tickFormatter = getTickFormatter(interval)
    const showLegend = config?.showLegend ?? true
    const showGrid = config?.showGrid ?? true
    const extra = config?.extra || {}
    const xAxisConfig = extra.xAxis || {}
    const yAxisConfig = extra.yAxis || {}
    const scaleType = yAxisConfig.scaleType || "linear"

    const visibleSeries = series.filter((s) => s.visible !== false)

    return (
        <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data}>
                    {showGrid && <CartesianGrid {...chartStyles.grid} />}

                    <XAxis
                        dataKey="x"
                        tickFormatter={tickFormatter}
                        {...chartStyles.axis}
                        domain={[xAxisConfig.min ?? "auto", xAxisConfig.max ?? "auto"]}
                        label={
                            config?.xAxis?.label
                                ? {
                                    value: config.xAxis.label,
                                    position: "insideBottom",
                                    offset: -5,
                                }
                                : undefined
                        }
                    />

                    <YAxis
                        scale={scaleType}
                        {...chartStyles.axis}
                        domain={[yAxisConfig.min ?? "auto", yAxisConfig.max ?? "auto"]}
                        label={
                            config?.yAxis?.label
                                ? {
                                    value: config.yAxis.label,
                                    angle: -90,
                                    position: "insideLeft",
                                }
                                : undefined
                        }
                    />

                    {config?.showTooltip !== false && (
                        <Tooltip
                            content={(props) => (
                                <CustomTooltip
                                    {...props}
                                    tickFormatter={tickFormatter}
                                />
                            )}
                            cursor={chartStyles.tooltip.cursor}
                        />
                    )}

                    {showLegend && (
                        <Legend
                            {...chartStyles.legend}
                            content={
                                renderLegend
                                    ? renderLegend
                                    : (props) => (
                                        <DefaultLegend {...props} />
                                    )
                            }
                        />
                    )}

                    {visibleSeries.map((s) => {
                        const extra = s.extra || {}
                        const seriesType = extra.seriesType || "line"
                        const color = s.color || chartStyles.defaultColor
                        const name = s.name || s.key

                        if (seriesType === "line") {
                            const lineStyle = extra.lineStyle as string | undefined
                            const strokeDasharray =
                                lineStyle === "dashed" ? "5 5"
                                    : lineStyle === "dotted" ? "2 2"
                                        : undefined

                            return (
                                <Line
                                    key={s.key}
                                    dataKey={s.key}
                                    stroke={color}
                                    name={name}
                                    strokeDasharray={strokeDasharray}
                                    strokeWidth={extra.lineWidth ?? 2}
                                    dot={extra.showMarkers !== false ? { r: 3 } : false}
                                    activeDot={extra.showMarkers !== false ? { r: 5 } : undefined}
                                />
                            )
                        }

                        if (seriesType === "bar") {
                            return (
                                <Bar
                                    key={s.key}
                                    dataKey={s.key}
                                    fill={color}
                                    name={name}
                                    radius={[4, 4, 0, 0]}
                                />
                            )
                        }

                        if (seriesType === "area") {
                            return (
                                <Area
                                    key={s.key}
                                    type="monotone"
                                    dataKey={s.key}
                                    stroke={color}
                                    fill={color}
                                    fillOpacity={extra.fillOpacity ?? 0.6}
                                    strokeWidth={extra.lineWidth ?? 2}
                                    name={name}
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
