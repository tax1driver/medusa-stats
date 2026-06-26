import { Text, Heading } from "@medusajs/ui"
import type { ChartRendererProps } from "./chart-renderer"

const defaultColor = "var(--fg-interactive)"

export const AggregateView = ({ data, series }: ChartRendererProps) => {
    const visibleSeries = series.filter((s) => s.visible !== false)

    if (visibleSeries.length === 0) {
        return (
            <div className="text-center py-8 text-ui-fg-muted">
                No data available
            </div>
        )
    }

    const lastRow = data.length > 0 ? data[data.length - 1] : null

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleSeries.map((s) => {
                const value = lastRow?.[s.key]
                const color = s.color || defaultColor

                return (
                    <div
                        key={s.key}
                        className="border border-ui-border-base rounded-lg p-4 bg-ui-bg-base"
                    >
                        <Text
                            size="xsmall"
                            className="text-ui-fg-subtle mb-1 truncate"
                        >
                            {s.name}
                        </Text>
                        <Heading
                            level="h2"
                            className="text-2xl font-semibold"
                            style={{ color }}
                        >
                            {typeof value === "number"
                                ? value.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                })
                                : value ?? "—"}
                        </Heading>
                    </div>
                )
            })}
        </div>
    )
}
