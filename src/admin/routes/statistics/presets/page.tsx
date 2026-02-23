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
    Drawer,
    DropdownMenu,
    IconButton,
    Text,
    toast,
} from "@medusajs/ui"
import { ArrowDownTray, EllipsisHorizontal, PencilSquare } from "@medusajs/icons"
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { STATISTICS_QUERY } from "../../../lib/queries"
import {
    listOptions,
    cloneOption,
    getOption,
    updateOption,
    createOption,
    listProviders,
    type StatisticsOption,
    type SeriesVisualizationConfig,
} from "../../../lib/statistics/api"
import { OptionEditDrawer } from "../../../components/option-edit-drawer"
import { OptionSelector } from "../../../components/option-selector-modal"

export const config = defineRouteConfig({
    label: "Option Presets",
    icon: ArrowDownTray,
})

import { Skeleton } from "../../../components/skeleton"

const PAGE_SIZE = 10
const columnHelper = createDataTableColumnHelper<StatisticsOption>()
const filterHelper = createDataTableFilterHelper<StatisticsOption>()

const AddPresetFromStatisticDrawer = ({
    open,
    onOpenChange,
    onSelect,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (data: {
        provider_id: string
        provider_option_name: string
        local_option_name: string
    }) => void
}) => {
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <Drawer.Content>
                <Drawer.Header>
                    <Drawer.Title>Select Statistic for Preset</Drawer.Title>
                    <Drawer.Description className="!txt-compact-small-plus">
                        Choose a statistic to create a reusable preset
                    </Drawer.Description>
                </Drawer.Header>

                <Drawer.Body className="overflow-hidden">
                    <OptionSelector
                        onSelect={onSelect}
                        enabled={open}
                    />
                </Drawer.Body>

                <Drawer.Footer>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                </Drawer.Footer>
            </Drawer.Content>
        </Drawer>
    )
}

const PresetsPage = () => {
    const queryClient = useQueryClient()

    const [search, setSearch] = useState("")
    const [filtering, setFiltering] = useState<DataTableFilteringState>({})
    const [sorting, setSorting] = useState<DataTableSortingState | null>(null)
    const [pagination, setPagination] = useState<DataTablePaginationState>({
        pageIndex: 0,
        pageSize: PAGE_SIZE,
    })

    const providerFilter = useMemo(() => {
        const value = filtering.provider_id
        if (typeof value === "string") {
            return value
        }
        return undefined
    }, [filtering])

    const offset = useMemo(() => {
        return pagination.pageIndex * pagination.pageSize
    }, [pagination])

    const orderBy = useMemo(() => {
        if (!sorting) return undefined
        return `${sorting.desc ? "-" : ""}${sorting.id}`
    }, [sorting])

    const [isSelectorOpen, setIsSelectorOpen] = useState(false)

    const [editingOptionId, setEditingOptionId] = useState<string | null>(null)
    const [isEditOptionOpen, setIsEditOptionOpen] = useState(false)
    const [drawerMode, setDrawerMode] = useState<"create" | "edit">("edit")

    const { data: presetsData, isLoading } = useQuery({
        queryKey: [STATISTICS_QUERY, "presets", providerFilter, pagination.pageSize, offset, search, orderBy],
        queryFn: () =>
            listOptions({
                limit: pagination.pageSize,
                offset,
                provider_id: providerFilter,
                q: search || undefined,
                order: orderBy,
                preset: true,
            }),
        placeholderData: keepPreviousData,
    })

    const { data: providers } = useQuery({
        queryKey: [STATISTICS_QUERY, "providers"],
        queryFn: () => listProviders({}),
    })

    const { data: editingOption, isLoading: isEditingOptionLoading } = useQuery({
        queryKey: [STATISTICS_QUERY, "options", editingOptionId],
        queryFn: () => getOption(editingOptionId!),
        enabled: Boolean(editingOptionId && isEditOptionOpen),
    })

    const createPresetMutation = useMutation({
        mutationFn: (data: {
            provider_id: string
            provider_option_name: string
            local_option_name: string
        }) =>
            createOption({
                ...data,
                preset: true,
            }),
        onSuccess: (createdOption) => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "presets"] })
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "options"] })
            toast.success("Preset created")

            setIsSelectorOpen(false)

            setDrawerMode("create")
            setEditingOptionId(createdOption.id)
            setIsEditOptionOpen(true)
        },
        onError: (error: unknown) => {
            const message = error instanceof Error ? error.message : "Failed to create preset"
            toast.error(message)
        },
    })

    const cloneAndEditMutation = useMutation({
        mutationFn: (preset: StatisticsOption) =>
            cloneOption(preset.id, {
                local_option_name: `${preset.local_option_name}`,
            }),
        onSuccess: (clonedOption) => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "presets"] })
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "options"] })
            toast.success("Preset cloned")
            setDrawerMode("create")
            setEditingOptionId(clonedOption.id)
            setIsEditOptionOpen(true)
        },
        onError: (error: unknown) => {
            const message = error instanceof Error ? error.message : "Failed to clone preset"
            toast.error(message)
        },
    })

    const updatePresetOptionsMutation = useMutation({
        mutationFn: async (
            updates: Array<{
                optionId: string
                data: Record<string, any>
                visualization_config?: SeriesVisualizationConfig | null
                cache_options?: { enabled?: boolean; ttl?: number } | null
                local_option_name?: string
                input_dependencies?: any[]
            }>
        ) => {
            await Promise.all(
                updates.map((update) =>
                    updateOption(update.optionId, {
                        data: update.data,
                        local_option_name: update.local_option_name,
                        visualization_config: update.visualization_config ?? undefined,
                        cache_options: update.cache_options ?? undefined,
                        input_dependencies: update.input_dependencies,
                    })
                )
            )
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "presets"] })
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "options"] })
            toast.success(drawerMode === "create" ? "Preset configured" : "Preset updated")
            handleEditDrawerChange(false)
        },
        onError: (error: unknown) => {
            const message = error instanceof Error ? error.message : "Failed to update preset"
            toast.error(message)
        },
    })

    const rowCount = useMemo(() => {
        return presetsData?.count || 0
    }, [presetsData?.count])

    const tableData = useMemo(() => {
        if (isLoading) {
            return Array.from({ length: PAGE_SIZE }, (_, i) => ({
                id: `skeleton-${i}`,
                provider_option_name: "",
                local_option_name: "",
                data: {},
                visualization_config: null,
                cache_options: null,
                parameter_config: null,
                preset: true,
                created_at: "",
                updated_at: "",
                provider_id: "",
                view_id: "",
                isLoading: true,
            } as StatisticsOption & { isLoading: boolean }))
        }

        return presetsData?.options || []
    }, [presetsData, isLoading])

    const handleEdit = (preset: StatisticsOption) => {
        setDrawerMode("edit")
        setEditingOptionId(preset.id)
        setIsEditOptionOpen(true)
    }

    const handleEditDrawerChange = (open: boolean) => {
        setIsEditOptionOpen(open)
        if (!open) {
            setEditingOptionId(null)
            setDrawerMode("edit")
        }
    }

    const handleStatisticSelected = (data: {
        provider_id: string
        provider_option_name: string
        local_option_name: string
    }) => {
        createPresetMutation.mutate(data)
    }

    const columns = useMemo(
        () => [
            columnHelper.accessor("local_option_name", {
                header: "Preset",
                enableSorting: true,
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
                            <p className="font-medium">{row.original.local_option_name}</p>
                        </div>
                    )
                },
            }),
            columnHelper.accessor("provider", {
                header: "Root Provider",
                cell: ({ row, getValue }) => {
                    if ((row.original as any).isLoading) {
                        return <Skeleton className="h-5 w-24" />
                    }

                    const provider = getValue()
                    return (
                        <Badge size="small" color="grey">
                            {provider?.display_name || provider?.id}
                        </Badge>
                    )
                },
            }),
            columnHelper.display({
                id: "composite",
                header: "Composite",
                cell: ({ row }) => {
                    if ((row.original as any).isLoading) {
                        return <Skeleton className="h-5 w-20" />
                    }

                    const count = row.original.input_dependencies?.length || 0
                    if (!count) {
                        return <Text className="text-ui-fg-subtle text-sm">-</Text>
                    }

                    return (
                        <Badge size="small" color="blue">
                            {count} {count === 1 ? "dependency" : "dependencies"}
                        </Badge>
                    )
                },
            }),
            columnHelper.accessor("updated_at", {
                header: "Updated",
                enableSorting: true,
                cell: ({ row, getValue }) => {
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

                    return (
                        <DropdownMenu>
                            <DropdownMenu.Trigger asChild>
                                <IconButton size="small" variant="transparent">
                                    <EllipsisHorizontal />
                                </IconButton>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content>
                                <DropdownMenu.Item onClick={() => handleEdit(row.original)}>
                                    <PencilSquare className="mr-2" />
                                    Edit
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu>
                    )
                },
            }),
        ],
        [cloneAndEditMutation]
    )

    const filters = useMemo(() => {
        return [
            filterHelper.accessor("provider_id", {
                type: "radio",
                label: "Provider",
                options: (providers?.providers || []).map((provider) => ({
                    label: provider.display_name || provider.id,
                    value: provider.id,
                })),
            }),
        ]
    }, [providers?.providers])

    const table = useDataTable({
        data: tableData,
        columns,
        getRowId: (row) => row.id,
        rowCount,
        isLoading: false,
        search: {
            state: search,
            onSearchChange: setSearch,
        },
        filters,
        filtering: {
            state: filtering,
            onFilteringChange: setFiltering,
        },
        pagination: {
            state: pagination,
            onPaginationChange: setPagination,
        },
        sorting: {
            state: sorting,
            onSortingChange: setSorting,
        },
    })

    return (
        <>
            <Container className="divide-y p-0">
                <div className="flex items-center justify-between px-6 py-4">
                    <Heading level="h2">Option Presets</Heading>
                    <Button variant="secondary" size="small" onClick={() => setIsSelectorOpen(true)}>
                        Create
                    </Button>
                </div>

                {!isLoading && rowCount === 0 && search.trim() === "" && !providerFilter ? (
                    <div className="flex h-[150px] w-full flex-col items-center justify-center gap-y-2">
                        <p className="font-medium font-sans txt-compact-small">No presets</p>
                        <p className="font-normal font-sans txt-small text-ui-fg-muted">Create your first preset to reuse statistic configurations.</p>
                    </div>
                ) : (
                    <DataTable instance={table}>
                        <DataTable.Toolbar className="flex flex-col items-end justify-between gap-2 md:flex-row md:items-center md:justify-end">
                            <div className="flex w-full gap-2 md:w-auto">
                                <DataTable.FilterMenu tooltip="Filter" />
                                <DataTable.SortingMenu tooltip="Sort" />
                                <DataTable.Search placeholder="Search presets..." />
                            </div>
                        </DataTable.Toolbar>
                        <DataTable.Table />
                        <DataTable.Pagination />
                    </DataTable>
                )}
            </Container>

            <AddPresetFromStatisticDrawer
                open={isSelectorOpen}
                onOpenChange={setIsSelectorOpen}
                onSelect={handleStatisticSelected}
            />

            <OptionEditDrawer
                open={isEditOptionOpen}
                onOpenChange={handleEditDrawerChange}
                options={editingOption ? [editingOption] : []}
                title={drawerMode === "create" ? "Configure Preset" : "Edit Preset"}
                description={
                    drawerMode === "create"
                        ? "Finalize parameters and dependencies for the new preset"
                        : "Update preset parameters and dependencies"
                }
                onSave={(updates) => updatePresetOptionsMutation.mutate(updates)}
                isSaving={updatePresetOptionsMutation.isPending}
                addButtonLabel="Add Dependency"
                showVisualizationOptions={false}
                showCacheOptions={false}
                context="preset"
                loading={isEditingOptionLoading && isEditOptionOpen}
            />
        </>
    )
}

export default PresetsPage
