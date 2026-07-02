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
    Switch,
    Avatar,
} from "@medusajs/ui"
import { PencilSquare, Trash, EllipsisHorizontal, ChartBar, DocumentText as DocumentDuplicate, XMark } from "@medusajs/icons"
import { useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { STATISTICS_QUERY } from "../../lib/queries"
import { listViews, deleteView, createView, getAllProviderStatistics, type StatisticsView, type AvailableStatistic, type AdminUser } from "../../lib/statistics/api"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Skeleton } from "../../components/skeleton"

const viewSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    stats_data: z.record(z.string(), z.any()).optional(),
    is_private: z.boolean().default(false),
})

type ViewFormData = z.infer<typeof viewSchema>

const columnHelper = createDataTableColumnHelper<StatisticsView>()

const getAvatarFallback = (label: string) => {
    return label
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
}

const resolveUser = (view: StatisticsView): AdminUser | null => {
    const user = view.user
    if (!user) return null
    if (Array.isArray(user)) return user[0] || null
    return user
}

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
                        return (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-5 w-5 rounded-full" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <Skeleton className="h-3 w-16" />
                            </div>
                        )
                    }
                    const user = resolveUser(row.original)
                    const author = user
                        ? {
                            label: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email,
                            path: `/settings/users/${user.id}`,
                        }
                        : null
                    const createdAt = getValue() as string | null
                    return (
                        <div className="flex flex-col gap-1">
                            {author ? (
                                <Link
                                    to={author.path}
                                    className="flex w-fit items-center gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Avatar size="2xsmall" fallback={getAvatarFallback(author.label)} />
                                    <span className="truncate max-w-[180px] text-ui-fg-interactive hover:text-ui-fg-interactive-hover">
                                        {author.label}
                                    </span>
                                </Link>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Avatar size="2xsmall" fallback="?" />
                                    <span className="text-ui-fg-muted">Unknown</span>
                                </div>
                            )}
                            <span className="text-ui-fg-subtle text-xs">
                                {createdAt ? new Date(createdAt).toLocaleDateString() : "-"}
                            </span>
                        </div>
                    )
                },
            }),
            columnHelper.accessor("is_private", {
                header: "Visibility",
                cell: ({ getValue, row }) => {
                    if ((row.original as any).isLoading) {
                        return <Skeleton className="h-5 w-16" />
                    }
                    return getValue() ? (
                        <Badge color="orange" size="small">Private</Badge>
                    ) : (
                        <Badge color="green" size="small">Public</Badge>
                    )
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
        watch,
        setValue,
        formState: { errors },
    } = useForm<ViewFormData>({
        resolver: zodResolver(viewSchema),
        defaultValues: {
            name: "",
            description: "",
            stats_data: {},
            is_private: false,
        },
    })


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

    const onSubmit = (data: ViewFormData) => {

        if (layoutConfigText.trim()) {
            try {
                const parsed = JSON.parse(layoutConfigText)
                if (!(parsed && typeof parsed === "object" && !Array.isArray(parsed))) {
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

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Private View</Label>
                                            <Text className="text-ui-fg-subtle text-xs mt-0.5">
                                                Only you can see and manage this view
                                            </Text>
                                        </div>
                                        <Switch
                                            checked={watch("is_private")}
                                            onCheckedChange={(checked) => setValue("is_private", checked)}
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
