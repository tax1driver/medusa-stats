import { useState } from "react"
import { Text, Table, Button } from "@medusajs/ui"
import { ChevronLeft, ChevronRight } from "@medusajs/icons"
import type { ChartRendererProps } from "./chart-renderer"



const DEFAULT_PAGE_SIZE = 10

type AggregateFn = "sum" | "avg" | "min" | "max" | "count"

type ListExtra = {
    pageSize?: number
    aggregate?: AggregateFn
}



function computeAggregate(values: number[], fn: AggregateFn): number | null {
    if (values.length === 0) return null

    switch (fn) {
        case "sum":
            return values.reduce((a, b) => a + b, 0)
        case "avg":
            return values.reduce((a, b) => a + b, 0) / values.length
        case "min":
            return Math.min(...values)
        case "max":
            return Math.max(...values)
        case "count":
            return values.length
    }
}

function formatValue(value: any): string {
    if (typeof value === "number") {
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
    }
    return value ?? "—"
}



const defaultColor = "var(--fg-interactive)"

export const ListView = ({ data, series }: ChartRendererProps) => {
    const visibleSeries = series.filter((s) => s.visible !== false)

    // per-series current page
    const [pages, setPages] = useState<Record<string, number>>({})

    if (visibleSeries.length === 0 || data.length === 0) {
        return (
            <div className="text-center py-8 text-ui-fg-muted">
                No data available
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {visibleSeries.map((s) => {
                const extra = (s.extra || {}) as ListExtra
                const pageSize = extra.pageSize ?? DEFAULT_PAGE_SIZE
                const aggregateFn = extra.aggregate

                const currentPage = pages[s.key] ?? 0
                const totalPages = Math.ceil(data.length / pageSize)
                const startIdx = currentPage * pageSize
                const pageData = data.slice(startIdx, startIdx + pageSize)

                const numericValues = data
                    .map((row) => row[s.key])
                    .filter((v): v is number => typeof v === "number")
                const aggregateValue =
                    aggregateFn && numericValues.length > 0
                        ? computeAggregate(numericValues, aggregateFn)
                        : null

                return (
                    <div key={s.key}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-sm flex-shrink-0"
                                />
                                <Text size="small" weight="plus">
                                    {s.name}
                                </Text>
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="secondary"
                                        size="small"
                                        disabled={currentPage === 0}
                                        onClick={() =>
                                            setPages((prev) => ({
                                                ...prev,
                                                [s.key]: currentPage - 1,
                                            }))
                                        }
                                    >
                                        <ChevronLeft />
                                    </Button>
                                    <Text
                                        size="xsmall"
                                        className="text-ui-fg-subtle px-2 tabular-nums"
                                    >
                                        {currentPage + 1} / {totalPages}
                                    </Text>
                                    <Button
                                        variant="secondary"
                                        size="small"
                                        disabled={
                                            currentPage >= totalPages - 1
                                        }
                                        onClick={() =>
                                            setPages((prev) => ({
                                                ...prev,
                                                [s.key]: currentPage + 1,
                                            }))
                                        }
                                    >
                                        <ChevronRight />
                                    </Button>
                                </div>
                            )}
                        </div>

                        <Table>
                            <Table.Header>
                                <Table.Row>
                                    <Table.HeaderCell>Label</Table.HeaderCell>
                                    <Table.HeaderCell className="text-right">
                                        Value
                                    </Table.HeaderCell>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {pageData.map((row, idx) => (
                                    <Table.Row key={`${s.key}-${idx}`}>
                                        <Table.Cell>
                                            <Text size="small">
                                                {String(row.x)}
                                            </Text>
                                        </Table.Cell>
                                        <Table.Cell className="text-right">
                                            <Text size="small" weight="plus">
                                                {formatValue(row[s.key])}
                                            </Text>
                                        </Table.Cell>
                                    </Table.Row>
                                ))}

                                {aggregateValue !== null && (
                                    <Table.Row className="border-t-2 border-ui-border-base bg-ui-bg-subtle">
                                        <Table.Cell>
                                            <Text
                                                size="small"
                                                weight="plus"
                                            >
                                                {aggregateFn!
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    aggregateFn!.slice(1)}
                                            </Text>
                                        </Table.Cell>
                                        <Table.Cell className="text-right">
                                            <Text size="small" weight="plus">
                                                {formatValue(aggregateValue)}
                                            </Text>
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Table.Body>
                        </Table>
                    </div>
                )
            })}
        </div>
    )
}
