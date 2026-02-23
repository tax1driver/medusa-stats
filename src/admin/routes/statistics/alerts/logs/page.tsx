import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
    Container,
    Heading,
    Badge,
    DataTable,
    useDataTable,
    createDataTableColumnHelper,
    createDataTableFilterHelper,
    DataTablePaginationState,
    DataTableFilteringState,
    DataTableSortingState,
    Text,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { STATISTICS_QUERY } from "../../../../lib/queries"
import { listAlertLogs, listAlerts, type StatisticsAlertLog } from "../../../../lib/statistics/api"
import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Skeleton } from "../../../../components/skeleton"

const columnHelper = createDataTableColumnHelper<StatisticsAlertLog>()

const getColumns = () => [
    columnHelper.accessor("alert.name", {
        header: "Alert Name",
        enableSorting: true,
        sortLabel: "Alert",
        cell: ({ row }) => {
            if ((row.original as any).isLoading) {
                return <Skeleton className="h-5 w-48" />
            }
            return (
                <div className="flex flex-col gap-y-1">
                    <Text size="small" leading="compact" weight="plus">
                        {row.original.alert?.name || "Unknown Alert"}
                    </Text>
                    {row.original.alert?.description && (
                        <Text size="small" leading="compact" className="text-ui-fg-subtle truncate max-w-md">
                            {row.original.alert.description}
                        </Text>
                    )}
                </div>
            )
        },
    }),
    columnHelper.accessor("alert.severity", {
        header: "Severity",
        cell: ({ getValue, row }) => {
            if ((row.original as any).isLoading) {
                return <Skeleton className="h-5 w-20" />
            }
            const severity = getValue()
            const colorMap = {
                info: "blue",
                warning: "orange",
                critical: "red",
            } as const
            return severity ? (
                <Badge size="small" color={colorMap[severity]}>
                    {severity}
                </Badge>
            ) : (
                <Text size="small" leading="compact" className="text-ui-fg-subtle">
                    -
                </Text>
            )
        },
    }),
    columnHelper.accessor("triggered_at", {
        header: "Triggered At",
        enableSorting: true,
        sortLabel: "Date",
        cell: ({ getValue, row }) => {
            if ((row.original as any).isLoading) {
                return <Skeleton className="h-5 w-32" />
            }
            const value = getValue()
            if (!value) {
                return (
                    <Text size="small" leading="compact" className="text-ui-fg-subtle">
                        -
                    </Text>
                )
            }
            const date = new Date(value)
            return (
                <div className="flex flex-col gap-y-1">
                    <Text size="small" leading="compact" weight="plus">
                        {date.toLocaleDateString()}
                    </Text>
                    <Text size="small" leading="compact" className="text-ui-fg-subtle">
                        {date.toLocaleTimeString()}
                    </Text>
                </div>
            )
        },
    }),
]

const filterHelper = createDataTableFilterHelper<StatisticsAlertLog>()

const getFilters = (alertOptions: Array<{ label: string; value: string }>) => [
    filterHelper.accessor("alert_id", {
        type: "select",
        label: "Alert",
        options: alertOptions,
    }),
    filterHelper.accessor("alert.severity", {
        type: "radio",
        label: "Severity",
        options: [
            { label: "Info", value: "info" },
            { label: "Warning", value: "warning" },
            { label: "Critical", value: "critical" },
        ],
    }),
]

const limit = 10

const AlertLogsPage = () => {
    const [searchParams] = useSearchParams()
    const alertIdFromUrl = searchParams.get("alert_id")

    const [pagination, setPagination] = useState<DataTablePaginationState>({
        pageSize: limit,
        pageIndex: 0,
    })
    const [search, setSearch] = useState<string>("")
    const [sorting, setSorting] = useState<DataTableSortingState | null>({ id: "triggered_at", desc: true });
    const [filtering, setFiltering] = useState<DataTableFilteringState>(() => {

        return alertIdFromUrl ? { alert_id: alertIdFromUrl } : {}
    })

    const offset = useMemo(() => {
        return pagination.pageIndex * pagination.pageSize
    }, [pagination])

    const orderBy = useMemo(() => {
        if (!sorting) return undefined
        return `${sorting.desc ? "-" : ""}${sorting.id}`
    }, [sorting])

    const alertIdFilter = useMemo(() => {
        const value = filtering.alert_id
        return value === undefined ? undefined : value as string
    }, [filtering])

    const severityFilter = useMemo(() => {
        const value = filtering["alert.severity"]
        return value === undefined ? undefined : value as "info" | "warning" | "critical"
    }, [filtering])


    const { data: alertsData } = useQuery({
        queryFn: () => listAlerts({ limit: 100 }),
        queryKey: [STATISTICS_QUERY, "alerts", "filter-list"],
    })

    const alertOptions = useMemo(() => {
        if (!alertsData?.alerts) return []
        return alertsData.alerts.map(alert => ({
            label: alert.name,
            value: alert.id,
        }))
    }, [alertsData])

    const { data, isLoading } = useQuery({
        queryFn: () => listAlertLogs({
            limit: pagination.pageSize,
            offset: offset,
            alert_id: alertIdFilter,
            severity: severityFilter,
            q: search || undefined,
            order: orderBy,
        }),
        queryKey: [STATISTICS_QUERY, "alert-logs", pagination.pageSize, offset, alertIdFilter, severityFilter, search, orderBy],
    })

    const columns = useMemo(() => getColumns(), [])

    const filters = useMemo(() => getFilters(alertOptions), [alertOptions])

    const skeletonData = useMemo(() => {
        return Array.from({ length: 5 }, (_, i) => ({
            id: `skeleton-${i}`,
            alert_id: '',
            triggered_at: '',
            evaluation_data: {},
            evaluation_hash: '',
            metadata: null,
            created_at: '',
            updated_at: '',
            isLoading: true,
        } as any))
    }, [])

    const tableData = useMemo(() => {
        if (isLoading) {
            return skeletonData
        }
        return data?.logs || []
    }, [data, isLoading, skeletonData])

    const table = useDataTable({
        data: tableData,
        columns,
        getRowId: (row) => row.id,
        rowCount: data?.count || 0,
        isLoading: false,
        pagination: {
            state: pagination,
            onPaginationChange: setPagination,
        },
        filtering: {
            state: filtering,
            onFilteringChange: setFiltering,
        },
        filters,
        search: {
            state: search,
            onSearchChange: setSearch,
        },
        sorting: {
            state: sorting,
            onSortingChange: setSorting,
        },
    })

    return (
        <Container className="divide-y p-0">
            <div className="flex items-center justify-between px-6 py-4">
                <Heading level="h2">Alert Logs</Heading>
            </div>

            {!isLoading && (!data || data.count === 0) && Object.keys(filtering).length === 0 && search.trim() === "" ? (
                <div className="flex h-[150px] w-full flex-col items-center justify-center gap-y-4">
                    <div className="flex flex-col items-center gap-y-3">
                        <div className="flex flex-col items-center gap-y-1">
                            <Text size="small" leading="compact" weight="plus">No alert logs</Text>
                            <Text size="small" leading="compact" className="text-ui-fg-subtle">Alert logs will appear here when alerts are triggered.</Text>
                        </div>
                    </div>
                </div>
            ) : (
                <DataTable instance={table}>
                    <DataTable.Toolbar className="flex flex-col items-end justify-between gap-2 md:flex-row md:items-center md:justify-end">
                        <div className="flex w-full gap-2 md:w-auto">
                            <DataTable.FilterMenu tooltip="Filter" />
                            <DataTable.SortingMenu tooltip="Sort" />
                            <DataTable.Search placeholder="Search alert logs..." />
                        </div>
                    </DataTable.Toolbar>
                    <DataTable.Table />
                    <DataTable.Pagination />
                </DataTable>
            )}
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Alert Logs",
})

export default AlertLogsPage
