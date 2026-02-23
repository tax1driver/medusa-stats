import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
    Container,
    Heading,
    Button,
    Badge,
    DataTable,
    useDataTable,
    createDataTableColumnHelper,
    DataTablePaginationState,
    DataTableSortingState,
    DropdownMenu,
    IconButton,
    Text,
    toast,
    Drawer,
    Input,
    Label,
    Textarea,
    usePrompt,
} from "@medusajs/ui"
import { PencilSquare, Trash, EllipsisHorizontal, ChartBar, DocumentText as DocumentDuplicate, XMark } from "@medusajs/icons"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { STATISTICS_QUERY } from "../../lib/queries"
import { listViews, deleteView, createView, getAllProviderStatistics, type StatisticsView, type AvailableStatistic } from "../../lib/statistics/api"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Skeleton } from "../../components/skeleton"

const viewSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    stats_data: z.record(z.any()).optional(),
})

type ViewFormData = z.infer<typeof viewSchema>

const columnHelper = createDataTableColumnHelper<StatisticsView>()

const useColumns = () => {
    const navigate = useNavigate()

    const columns = useMemo(
        () => [
            columnHelper.accessor("name", {
                header: "View Name",
                enableSorting: true,
                sortLabel: "Name",
                sortAscLabel: "A-Z",
                sortDescLabel: "Z-A",
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
                        <div>
                            <p className="font-medium">{row.original.name}</p>
                        </div>
                    )
                },
            }),
            columnHelper.accessor("created_at", {
                header: "Created",
                enableSorting: true,
                sortLabel: "Date",
                cell: ({ getValue, row }) => {
                    if ((row.original as any).isLoading) {
                        return <Skeleton className="h-5 w-24" />
                    }
                    const value = getValue()
                    return value ? new Date(value).toLocaleDateString() : "-"
                },
            }),
            columnHelper.display({
                id: "actions",
                cell: ({ row }) => {
                    if ((row.original as any).isLoading) {
                        return null
                    }
                    return <ViewActions view={row.original} />
                },
            }),
        ],
        [navigate]
    )

    return columns
}

const ViewActions = ({ view }: { view: StatisticsView }) => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const prompt = usePrompt()

    const deleteMutation = useMutation({
        mutationFn: () => deleteView(view.id),
        onSuccess: () => {
            toast.success("Success", {
                description: "View deleted successfully",
            })
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views"] })
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to delete view",
            })
        },
    })

    return (
        <DropdownMenu>
            <DropdownMenu.Trigger asChild>
                <IconButton
                    size="small"
                    variant="transparent"
                    onClick={(e) => e.stopPropagation()}
                >
                    <EllipsisHorizontal />
                </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content onClick={(e) => e.stopPropagation()}>
                <DropdownMenu.Item onClick={() => navigate(`/statistics/views/${view.id}`)}>
                    <ChartBar className="mr-2" />
                    View Details
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => navigate(`/statistics/views/${view.id}/edit`)}>
                    <PencilSquare className="mr-2" />
                    Edit
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => {
                    // TODO: Implement clone
                    toast.info("Coming soon", {
                        description: "Clone functionality will be available soon",
                    })
                }}>
                    <DocumentDuplicate className="mr-2" />
                    Clone
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item
                    onClick={async () => {
                        const confirmed = await prompt({
                            title: "Delete view?",
                            description: `Are you sure you want to delete "${view.name}"?`,
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

const PAGE_SIZE = 10;

const CreateViewModal = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [layoutConfigText, setLayoutConfigText] = useState('{\n  "preset": "compact"\n}')
    const [selectedStatistics, setSelectedStatistics] = useState<{
        provider_id: string
        statistic: AvailableStatistic
        data: Record<string, any>
    }[]>([])

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ViewFormData>({
        resolver: zodResolver(viewSchema),
        defaultValues: {
            name: "",
            description: "",
            stats_data: {},
        },
    })

    const { data: statisticsData } = useQuery({
        queryKey: [STATISTICS_QUERY, "providers", "all-statistics"],
        queryFn: () => getAllProviderStatistics(),
    })

    // Group statistics by provider
    const groupedStatistics = useMemo(() => {
        if (!statisticsData?.statistics) return {}

        return statisticsData.statistics.reduce((acc, stat) => {
            if (!acc[stat.provider_id]) {
                acc[stat.provider_id] = []
            }
            acc[stat.provider_id].push(stat)
            return acc
        }, {} as Record<string, (AvailableStatistic & { provider_name: string })[]>)
    }, [statisticsData])

    const createMutation = useMutation({
        mutationFn: (data: ViewFormData & {
            options: Array<{
                provider_id: string
                statistic_key: string
                data: Record<string, any>
            }>
        }) => createView(data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views"] })
            toast.success("Success", {
                description: "View created successfully",
            })
            reset()
            setLayoutConfigText('{\n  "preset": "compact"\n}')
            setSelectedStatistics([])
            onOpenChange(false)
            navigate(`/statistics/views/${response.view.id}`)
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to create view",
            })
        },
    })

    const handleAddStatistic = (providerId: string, statistic: AvailableStatistic) => {
        setSelectedStatistics([
            ...selectedStatistics,
            {
                provider_id: providerId,
                statistic,
                data: {},
            }
        ])
    }

    const handleRemoveStatistic = (index: number) => {
        setSelectedStatistics(selectedStatistics.filter((_, i) => i !== index))
    }

    const onSubmit = (data: ViewFormData) => {
        let layoutConfig: Record<string, any> | undefined = undefined

        if (layoutConfigText.trim()) {
            try {
                const parsed = JSON.parse(layoutConfigText)
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                    layoutConfig = parsed
                } else {
                    toast.error("Invalid layout config", {
                        description: "Layout config must be a JSON object",
                    })
                    return
                }
            } catch {
                toast.error("Invalid layout config", {
                    description: "Layout config must be valid JSON",
                })
                return
            }
        }

        const options = selectedStatistics.map(item => ({
            provider_id: item.provider_id,
            statistic_key: item.statistic.id,
            data: item.data,
        }))

        createMutation.mutate({
            ...data,
            options,
        })
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <Drawer.Content>
                <Drawer.Header>
                    <Drawer.Title>Create Statistics View</Drawer.Title>
                    <Drawer.Description className="!txt-compact-small-plus">
                        Create a new statistics view
                    </Drawer.Description>
                    <IconButton
                        size="small"
                        variant="transparent"
                        onClick={() => onOpenChange(false)}
                        className="absolute right-4 top-4"
                    >
                        <XMark />
                    </IconButton>
                </Drawer.Header>

                <Drawer.Body>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="flex flex-col gap-6">
                            {/* Basic Information */}
                            <div>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="name">Name *</Label>
                                        <Input
                                            id="name"
                                            {...register("name")}
                                            placeholder="e.g., Sales Dashboard"
                                        />
                                        {errors.name && (
                                            <Text className="text-ui-fg-error text-sm mt-1">
                                                {errors.name.message}
                                            </Text>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            {...register("description")}
                                            placeholder="Describe what this view is for..."
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </Drawer.Body>
                <Drawer.Footer>
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit(onSubmit)}
                            size="small"
                            isLoading={createMutation.isPending}
                        >
                            Create View
                        </Button>
                    </div>
                </Drawer.Footer>
            </Drawer.Content>
        </Drawer>
    )
}

const StatisticsDashboardPage = () => {
    const navigate = useNavigate()
    const columns = useColumns()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

    const [pagination, setPagination] = useState<DataTablePaginationState>({
        pageSize: PAGE_SIZE,
        pageIndex: 0,
    })
    const [search, setSearch] = useState<string>("")
    const [sorting, setSorting] = useState<DataTableSortingState | null>(null)

    const offset = useMemo(() => {
        return pagination.pageIndex * pagination.pageSize
    }, [pagination])

    const orderBy = useMemo(() => {
        if (!sorting) return undefined
        return `${sorting.desc ? "-" : ""}${sorting.id}`
    }, [sorting])

    const { data, isLoading } = useQuery({
        queryFn: () => listViews({
            limit: pagination.pageSize,
            offset: offset,
            q: search,
            order: orderBy,
        }),
        queryKey: [STATISTICS_QUERY, "views", pagination.pageSize, offset, search, orderBy],
        placeholderData: keepPreviousData,
    })

    // Create skeleton data for loading state
    const skeletonData = useMemo(() => {
        return Array.from({ length: 5 }, (_, i) => ({
            id: `skeleton-${i}`,
            name: '',
            description: null,
            stats_data: null,
            metadata: null,
            created_at: '',
            updated_at: '',
            isLoading: true,
        } as any))
    }, [])

    const tableData = useMemo(() => {
        if (isLoading && !data) {
            return skeletonData
        }
        return data?.views || []
    }, [data, isLoading, skeletonData])

    const rowCount = useMemo(() => {
        return data?.count || 0
    }, [data?.count])

    const table = useDataTable({
        data: tableData,
        columns,
        getRowId: (row) => row.id,
        rowCount,
        pagination: {
            state: pagination,
            onPaginationChange: setPagination,
        },
        search: {
            state: search,
            onSearchChange: setSearch,
        },
        sorting: {
            state: sorting,
            onSortingChange: setSorting,
        },
        onRowClick: (_, row) => {
            if (!(row as any).isLoading) {
                navigate(`/statistics/views/${row.id}`)
            }
        },
    })

    return (
        <>
            <CreateViewModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />

            <Container className="divide-y p-0">
                <div className="flex items-center justify-between px-6 py-4">
                    <Heading level="h2">Views</Heading>
                    <Button
                        size="small"
                        variant="secondary"
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        Create
                    </Button>
                </div>

                <DataTable instance={table}>
                    <DataTable.Toolbar className="flex flex-col items-end justify-between gap-2 md:flex-row md:items-center md:justify-end">
                        <div className="flex w-full gap-2 md:w-auto">
                            <DataTable.SortingMenu tooltip="Sort" />
                            <DataTable.Search placeholder="Search views..." />
                        </div>
                    </DataTable.Toolbar>
                    <DataTable.Table />
                    <DataTable.Pagination />
                </DataTable>
            </Container>
        </>
    )
}


export const config = defineRouteConfig({
    label: "Statistics",
    icon: ChartBar,
})

export default StatisticsDashboardPage
