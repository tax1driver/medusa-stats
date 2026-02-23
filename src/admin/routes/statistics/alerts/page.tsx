import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
    Container,
    Heading,
    Button,
    Badge,
    DataTable,
    useDataTable,
    createDataTableColumnHelper,
    createDataTableFilterHelper,
    DataTablePaginationState,
    DataTableFilteringState,
    DataTableSortingState,
    DropdownMenu,
    IconButton,
    Switch,
    toast,
    usePrompt,
    Text,
} from "@medusajs/ui"
import { PencilSquare, Trash, EllipsisHorizontal, BarsThree } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { STATISTICS_QUERY } from "../../../lib/queries"
import { getAlert, listAlerts, deleteAlert, toggleAlert, type StatisticsAlert } from "../../../lib/statistics/api"
import { useMemo, useState } from "react"
import { CreateAlertModal } from "../../../components/create-alert-modal"
import { formatDuration, intervalToDuration } from "date-fns"
import { useNavigate } from "react-router-dom"
import { Skeleton } from "../../../components/skeleton"

const columnHelper = createDataTableColumnHelper<StatisticsAlert>()

const getColumns = (onEdit: (alertId: string) => void) => [
    columnHelper.accessor("name", {
        header: "Alert Name",
        enableSorting: true,
        sortLabel: "Name",
        cell: ({ row }) => {
            if ((row.original as any).isLoading) {
                return (
                    <div>
                        <Skeleton className="h-5 w-48 mb-1" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                )
            }
            return (
                <div className="flex flex-col gap-y-1">
                    <Text size="small" leading="compact" weight="plus">
                        {row.original.name}
                    </Text>
                    {row.original.description && (
                        <Text size="small" leading="compact" className="text-ui-fg-subtle truncate max-w-md">
                            {row.original.description}
                        </Text>
                    )}
                </div>
            )
        },
    }),
    columnHelper.accessor("severity", {
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
            return (
                <Badge size="small" color={colorMap[severity]}>
                    {severity}
                </Badge>
            )
        },
    }),
    columnHelper.accessor("option.local_option_name", {
        header: "Related Statistic",
        cell: ({ getValue, row }) => {
            if ((row.original as any).isLoading) {
                return <Skeleton className="h-5 w-32" />
            }
            return getValue() || "-"
        }
    }),
    columnHelper.accessor("option.provider.display_name", {
        header: "Root Provider",
        cell: ({ getValue, row }) => {
            if ((row.original as any).isLoading) {
                return <Skeleton className="h-5 w-32" />
            }
            return (
                <Badge size="small" color="grey">
                    {getValue() || "-"}
                </Badge>
            )
        }
    }),
    columnHelper.accessor("interval", {
        header: "Reference Period",
        cell: ({ getValue, row }) => {
            if ((row.original as any).isLoading) {
                return <Skeleton className="h-5 w-24" />
            }

            const now = new Date();
            const then = new Date(now.getTime() + getValue() * 1000);

            const formatted = formatDuration(intervalToDuration({ start: now, end: then }));
            return formatted;
        }
    }),
    columnHelper.accessor("is_enabled", {
        header: "Status",
        cell: ({ row }) => {
            if ((row.original as any).isLoading) {
                return <Skeleton className="h-5 w-16" />
            }
            return (
                <AlertToggle alert={row.original} />
            )
        },
    }),
    columnHelper.accessor("created_at", {
        header: "Created",
        enableSorting: true,
        sortLabel: "Date",
        cell: ({ row }) => {
            if ((row.original as any).isLoading) {
                return <Skeleton className="h-5 w-24" />
            }
            const value = row.original.created_at
            return value ? new Date(value).toLocaleDateString() : "-"
        },
    }),
    columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
            if ((row.original as any).isLoading) {
                return null
            }
            return <AlertActions alert={row.original} onEdit={onEdit} />
        },
    }),
]

const AlertToggle = ({ alert }: { alert: StatisticsAlert }) => {
    const queryClient = useQueryClient()

    const toggleMutation = useMutation({
        mutationFn: (enabled: boolean) => toggleAlert(alert.id, enabled),
        onSuccess: () => {
            toast.success(`Alert ${alert.is_enabled ? "disabled" : "enabled"}`);
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "alerts"] })
        },
    })

    return (
        <Switch
            checked={alert.is_enabled}
            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
        />
    )
}

const AlertActions = ({
    alert,
    onEdit,
}: {
    alert: StatisticsAlert
    onEdit: (alertId: string) => void
}) => {
    const queryClient = useQueryClient()
    const prompt = usePrompt()
    const navigate = useNavigate()

    const deleteMutation = useMutation({
        mutationFn: () => deleteAlert(alert.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "alerts"] })
        },
    })

    return (
        <DropdownMenu>
            <DropdownMenu.Trigger asChild>
                <IconButton size="small" variant="transparent">
                    <EllipsisHorizontal />
                </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                <DropdownMenu.Item onClick={() => onEdit(alert.id)}>
                    <PencilSquare className="mr-2" />
                    Edit
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => navigate(`/statistics/alerts/logs?alert_id=${alert.id}`)}>
                    <BarsThree className="mr-2" />
                    View Logs
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                    onClick={async () => {
                        const confirmed = await prompt({
                            title: "Delete alert?",
                            description: `Are you sure you want to delete "${alert.name}"?`,
                            variant: "danger",
                            confirmText: "Delete",
                        })

                        if (!confirmed) {
                            return
                        }

                        deleteMutation.mutate()
                    }}
                    className="text-ui-fg-error"
                >
                    <Trash className="mr-2" />
                    Delete
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu>
    )
}

const filterHelper = createDataTableFilterHelper<StatisticsAlert>()

const filters = [
    filterHelper.accessor("severity", {
        type: "radio",
        label: "Severity",
        options: [
            { label: "Info", value: "info" },
            { label: "Warning", value: "warning" },
            { label: "Critical", value: "critical" },
        ],
    }),
    filterHelper.accessor("is_enabled", {
        type: "radio",
        label: "Status",
        options: [
            { label: "Enabled", value: "true" },
            { label: "Disabled", value: "false" },
        ],
    }),
]

const limit = 10

const AlertsPage = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [editingAlertId, setEditingAlertId] = useState<string | null>(null)

    const [pagination, setPagination] = useState<DataTablePaginationState>({
        pageSize: limit,
        pageIndex: 0,
    })
    const [search, setSearch] = useState<string>("")
    const [sorting, setSorting] = useState<DataTableSortingState | null>(null)
    const [filtering, setFiltering] = useState<DataTableFilteringState>({})

    const offset = useMemo(() => {
        return pagination.pageIndex * pagination.pageSize
    }, [pagination])

    const orderBy = useMemo(() => {
        if (!sorting) return undefined
        return `${sorting.desc ? "-" : ""}${sorting.id}`
    }, [sorting])

    const severityFilter = useMemo(() => {
        const value = filtering.severity
        return value === undefined ? undefined : value
    }, [filtering])

    const enabledFilter = useMemo(() => {
        const value = filtering.is_enabled
        if (value === undefined) return undefined
        return value === "true"
    }, [filtering])

    const { data, isLoading } = useQuery({
        queryFn: () => listAlerts({
            limit: pagination.pageSize,
            offset: offset,
            severity: severityFilter as string | undefined,
            is_enabled: enabledFilter,
            q: search || undefined,
            order: orderBy,
        }),
        queryKey: [STATISTICS_QUERY, "alerts", pagination.pageSize, offset, severityFilter, enabledFilter, search, orderBy],
    })

    const { data: editingAlert } = useQuery({
        queryFn: () => getAlert(editingAlertId!),
        queryKey: [STATISTICS_QUERY, "alerts", "edit", editingAlertId],
        enabled: isCreateModalOpen && !!editingAlertId,
    })

    const columns = useMemo(() => {
        return getColumns((alertId) => {
            setEditingAlertId(alertId)
            setIsCreateModalOpen(true)
        })
    }, [])

    const skeletonData = useMemo(() => {
        return Array.from({ length: 5 }, (_, i) => ({
            id: `skeleton-${i}`,
            name: '',
            description: null,
            option_id: '',
            condition: {},
            severity: 'info' as const,
            is_enabled: true,
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
        return data?.alerts || []
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
                <Heading level="h2">Alerts</Heading>
                <Button
                    variant="secondary"
                    size="small"
                    onClick={() => {
                        setEditingAlertId(null)
                        setIsCreateModalOpen(true)
                    }}
                >
                    Create
                </Button>
            </div>

            {!isLoading && (!data || data.count === 0) && Object.keys(filtering).length === 0 && search.trim() === "" ? (
                <div className="flex h-[150px] w-full flex-col items-center justify-center gap-y-4">
                    <div className="flex flex-col items-center gap-y-3">
                        <div className="flex flex-col items-center gap-y-1">
                            <Text size="small" leading="compact" weight="plus">No alerts</Text>
                            <Text size="small" leading="compact" className="text-ui-fg-subtle">Create your first alert to start monitoring statistics.</Text>
                        </div>
                    </div>
                </div>
            ) : (
                <DataTable instance={table}>
                    <DataTable.Toolbar className="flex flex-col items-end justify-between gap-2 md:flex-row md:items-center md:justify-end">
                        <div className="flex w-full gap-2 md:w-auto">
                            <DataTable.FilterMenu tooltip="Filter" />
                            <DataTable.SortingMenu tooltip="Sort" />
                            <DataTable.Search placeholder="Search alerts..." />
                        </div>
                    </DataTable.Toolbar>
                    <DataTable.Table />
                    <DataTable.Pagination />
                </DataTable>
            )}

            <CreateAlertModal
                open={isCreateModalOpen}
                onOpenChange={(open) => {
                    setIsCreateModalOpen(open)
                    if (!open) {
                        setEditingAlertId(null)
                    }
                }}
                initialAlert={editingAlert || null}
            />
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Alerts",
})

export default AlertsPage
