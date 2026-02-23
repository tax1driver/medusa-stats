import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
    Container,
    Heading,
    Button,
    Badge,
    Text,
    DropdownMenu,
    IconButton,
    Drawer,
    Input,
    Label,
    Switch,
    Select,
    Textarea,
    Skeleton,
    toast,
    usePrompt,
} from "@medusajs/ui"
import {
    EllipsisHorizontal,
    PencilSquare,
    Trash,
    ChartBar,
    DocumentText as DocumentDuplicate,
    Plus,
} from "@medusajs/icons"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { STATISTICS_QUERY } from "../../../../lib/queries"
import { useState, useMemo, useEffect } from "react"
import {
    getView,
    updateView,
    deleteView,
    calculateView,
    createOption,
    getAllProviderStatistics,
    updateOption,
    createChart,
    updateChart,
    deleteChart,
    addStatisticsToChart,
    listOptions,
    cloneOption,
    type AvailableStatistic,
    type StatisticsOption,
    SeriesVisualizationConfig,
} from "../../../../lib/statistics/api"
import { ChartCard } from "../../../../components/chart-card"
import { formatDate } from "date-fns"
import { OptionSelector } from "../../../../components/option-selector-modal"

const PERIOD_PRESETS = [
    { key: 'last1day', label: 'Last Day', quickLabel: 'Day', type: 'rolling' as const, config: { count: 1, unit: 'days' }, quick: true },
    { key: 'last7days', label: 'Last 7 Days', quickLabel: '7 Days', type: 'rolling' as const, config: { count: 7, unit: 'days' }, quick: true },
    { key: 'last14days', label: 'Last 14 Days', quickLabel: '14 Days', type: 'rolling' as const, config: { count: 14, unit: 'days' }, quick: true },
    { key: 'last30days', label: 'Last 30 Days', quickLabel: '30 Days', type: 'rolling' as const, config: { count: 30, unit: 'days' }, quick: true },
    { key: 'last90days', label: 'Last 90 Days', quickLabel: '90 Days', type: 'rolling' as const, config: { count: 90, unit: 'days' }, quick: true },
    { key: 'today', label: 'Today', quickLabel: 'Today', type: 'calendar' as const, config: { reference: 'today' }, quick: false },
    { key: 'yesterday', label: 'Yesterday', quickLabel: 'Yesterday', type: 'calendar' as const, config: { reference: 'yesterday' }, quick: false },
    { key: 'wtd', label: 'Week to Date', quickLabel: 'WTD', type: 'calendar' as const, config: { reference: 'wtd' }, quick: false },
    { key: 'lastweek', label: 'Last Week', quickLabel: 'Last Week', type: 'calendar' as const, config: { reference: 'lastweek' }, quick: false },
    { key: 'mtd', label: 'Month to Date', quickLabel: 'Month-to-Date', type: 'calendar' as const, config: { reference: 'mtd' }, quick: true },
    { key: 'lastmonth', label: 'Last Month', quickLabel: 'Last Month', type: 'calendar' as const, config: { reference: 'lastmonth' }, quick: false },
    { key: 'qtd', label: 'Quarter to Date', quickLabel: 'QTD', type: 'calendar' as const, config: { reference: 'qtd' }, quick: false },
    { key: 'lastquarter', label: 'Last Quarter', quickLabel: 'Last Quarter', type: 'calendar' as const, config: { reference: 'lastquarter' }, quick: false },
    { key: 'ytd', label: 'Year to Date', quickLabel: 'Year-to-Date', type: 'calendar' as const, config: { reference: 'ytd' }, quick: true },
    { key: 'lastyear', label: 'Last Year', quickLabel: 'Last Year', type: 'calendar' as const, config: { reference: 'lastyear' }, quick: false },
]

const INTERVAL_PRESETS = [
    { seconds: 60, label: '1 Minute', quickLabel: '1m', quick: false },
    { seconds: 300, label: '5 Minutes', quickLabel: '5m', quick: false },
    { seconds: 900, label: '15 Minutes', quickLabel: '15m', quick: false },
    { seconds: 1800, label: '30 Minutes', quickLabel: '30m', quick: false },
    { seconds: 3600, label: '1 Hour', quickLabel: '1H', quick: true },
    { seconds: 14400, label: '4 Hours', quickLabel: '4H', quick: true },
    { seconds: 43200, label: '12 Hours', quickLabel: '12H', quick: true },
    { seconds: 86400, label: '1 Day', quickLabel: '1D', quick: true },
    { seconds: 604800, label: '1 Week', quickLabel: '1W', quick: true },
    { seconds: 2592000, label: '1 Month', quickLabel: '1M', quick: true },
]


const EditViewModal = ({ view, open, onOpenChange }: { view: any; open: boolean; onOpenChange: (open: boolean) => void }) => {
    const queryClient = useQueryClient()

    type EditViewFormValues = {
        name: string
        description: string
        cache_override: boolean
        cache_enabled: boolean
        cache_ttl: number
    }

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<EditViewFormValues>({
        defaultValues: {
            name: view.name || "",
            description: view.description || "",
            cache_override: view.cache_options !== null && view.cache_options !== undefined,
            cache_enabled: view.cache_options?.enabled ?? true,
            cache_ttl: view.cache_options?.ttl ?? 3600,
        },
    })

    const cacheOverride = watch("cache_override")
    const cacheEnabled = watch("cache_enabled")

    useEffect(() => {
        reset({
            name: view.name || "",
            description: view.description || "",
            cache_override: view.cache_options !== null && view.cache_options !== undefined,
            cache_enabled: view.cache_options?.enabled ?? true,
            cache_ttl: view.cache_options?.ttl ?? 3600,
        })
    }, [view, open])

    const updateMutation = useMutation({
        mutationFn: (data: { name: string; description?: string; cache_options?: { enabled?: boolean; ttl?: number } | null }) => updateView(view.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views", view.id] })
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views"] })
            toast.success("Success", {
                description: "View updated successfully",
            })
            onOpenChange(false)
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to update view",
            })
        },
    })

    const onSubmit = (data: EditViewFormValues) => {
        updateMutation.mutate({
            name: data.name.trim(),
            description: data.description.trim(),
            cache_options: data.cache_override ? { enabled: data.cache_enabled, ttl: data.cache_ttl || 3600 } : null,
        })
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <Drawer.Content>
                <Drawer.Header>
                    <Drawer.Title>Edit View</Drawer.Title>
                    <Drawer.Description className="!txt-compact-small-plus">
                        Edit the view name and description
                    </Drawer.Description>
                </Drawer.Header>

                <Drawer.Body>
                    <form id="edit-view-form" onSubmit={handleSubmit(onSubmit)}>
                        <div className="flex flex-col gap-6">
                            <div>
                                <Label htmlFor="view-name">Name *</Label>
                                <Input
                                    id="view-name"
                                    {...register("name", {
                                        validate: (value) => value.trim().length > 0 || "Name is required",
                                    })}
                                    placeholder="e.g., Sales Dashboard"
                                />
                                {errors.name && (
                                    <Text className="text-ui-fg-error text-sm mt-1">
                                        {errors.name.message}
                                    </Text>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="view-description">Description</Label>
                                <Textarea
                                    id="view-description"
                                    {...register("description")}
                                    placeholder="Describe what this view is for..."
                                    rows={3}
                                />
                            </div>

                            <div className="border-t border-ui-border-base pt-4">
                                <div className="mb-4">
                                    <Label>Cache Options</Label>
                                    <Text className="text-ui-fg-subtle text-sm mt-1">
                                        Configure caching behavior for this view
                                    </Text>
                                </div>

                                <div className="space-y-4">
                                    {/* Override Checkbox */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Override Cache Settings</Label>
                                            <Text className="text-ui-fg-subtle text-xs mt-0.5">
                                                Use custom cache settings for this view
                                            </Text>
                                        </div>
                                        <Switch
                                            checked={cacheOverride}
                                            onCheckedChange={(checked) => {
                                                setValue("cache_override", checked, { shouldDirty: true })
                                                if (checked && !cacheEnabled) {
                                                    setValue("cache_enabled", true, { shouldDirty: true })
                                                }
                                            }}
                                        />
                                    </div>

                                    {/* Show cache options only when override is enabled */}
                                    {cacheOverride && (
                                        <>
                                            <div className="flex items-center justify-between pl-4 border-l-2 border-ui-border-base">
                                                <div>
                                                    <Label>Enable Caching</Label>
                                                    <Text className="text-ui-fg-subtle text-xs mt-0.5">
                                                        Cache results to improve performance
                                                    </Text>
                                                </div>
                                                <Switch
                                                    checked={cacheEnabled}
                                                    onCheckedChange={(checked) => setValue("cache_enabled", checked, { shouldDirty: true })}
                                                />
                                            </div>

                                            {cacheEnabled && (
                                                <div className="pl-4 border-l-2 border-ui-border-base">
                                                    <Label htmlFor="cache-ttl">Cache TTL (seconds)</Label>
                                                    <Input
                                                        id="cache-ttl"
                                                        type="number"
                                                        min="60"
                                                        {...register("cache_ttl", { valueAsNumber: true })}
                                                        placeholder="3600"
                                                    />
                                                    <Text className="text-ui-fg-subtle text-xs mt-1">
                                                        How long to cache results (default: 3600s / 1 hour)
                                                    </Text>
                                                </div>
                                            )}
                                        </>
                                    )}
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
                            type="submit"
                            form="edit-view-form"
                            size="small"
                            isLoading={updateMutation.isPending}
                        >
                            Save Changes
                        </Button>
                    </div>
                </Drawer.Footer>
            </Drawer.Content>
        </Drawer>
    )
}

// Create Chart Modal
const CreateChartModal = ({
    viewId,
    open,
    onOpenChange
}: {
    viewId: string
    open: boolean
    onOpenChange: (open: boolean) => void
}) => {
    const queryClient = useQueryClient()

    type CreateChartFormValues = {
        name: string
        description: string
    }

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateChartFormValues>({
        defaultValues: {
            name: "",
            description: "",
        },
    })

    const createMutation = useMutation({
        mutationFn: (data: { view_id: string; name: string; description?: string }) => createChart(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views", viewId] })
            toast.success("Success", {
                description: "Chart created successfully",
            })
            onOpenChange(false)
            reset({
                name: "",
                description: "",
            })
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to create chart",
            })
        },
    })

    const onSubmit = (data: CreateChartFormValues) => {
        createMutation.mutate({
            view_id: viewId,
            name: data.name.trim(),
            description: data.description.trim(),
        })
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <Drawer.Content>
                <Drawer.Header>
                    <Drawer.Title>Create Chart</Drawer.Title>
                    <Drawer.Description className="!txt-compact-small-plus">
                        Create a new chart container. You can add series to it after creation.
                    </Drawer.Description>
                </Drawer.Header>

                <Drawer.Body>
                    <form id="create-chart-form" onSubmit={handleSubmit(onSubmit)}>
                        <div className="flex flex-col gap-6">
                            <div>
                                <Label htmlFor="chart-name">Name *</Label>
                                <Input
                                    id="chart-name"
                                    {...register("name", {
                                        validate: (value) => value.trim().length > 0 || "Name is required",
                                    })}
                                    placeholder="e.g., Revenue Trends"
                                />
                                {errors.name && (
                                    <Text className="text-ui-fg-error text-sm mt-1">
                                        {errors.name.message}
                                    </Text>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="chart-description">Description</Label>
                                <Textarea
                                    id="chart-description"
                                    {...register("description")}
                                    placeholder="Describe what this chart shows..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    </form>
                </Drawer.Body>
                <Drawer.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="create-chart-form"
                        isLoading={createMutation.isPending}
                    >
                        Create Chart
                    </Button>
                </Drawer.Footer>
            </Drawer.Content>
        </Drawer>
    )
}

// Edit Chart Modal
const EditChartModal = ({
    chart,
    open,
    onOpenChange
}: {
    chart: any
    open: boolean
    onOpenChange: (open: boolean) => void
}) => {
    const queryClient = useQueryClient()

    type EditChartFormValues = {
        name: string
        description: string
    }

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<EditChartFormValues>({
        defaultValues: {
            name: chart?.name || "",
            description: chart?.description || "",
        },
    })

    // Update local state when chart changes
    useEffect(() => {
        if (chart) {
            reset({
                name: chart.name || "",
                description: chart.description || "",
            })
        }
    }, [chart, open])

    const updateMutation = useMutation({
        mutationFn: (data: { name: string; description?: string }) => updateChart(chart.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views", chart.view_id] })
            toast.success("Success", {
                description: "Chart updated successfully",
            })
            onOpenChange(false)
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to update chart",
            })
        },
    })

    const onSubmit = (data: EditChartFormValues) => {
        updateMutation.mutate({
            name: data.name.trim(),
            description: data.description.trim(),
        })
    }

    if (!chart) return null

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <Drawer.Content>
                <Drawer.Header>
                    <Drawer.Title>Edit Chart</Drawer.Title>
                    <Drawer.Description className="!txt-compact-small-plus">
                        Edit the chart name and description
                    </Drawer.Description>
                </Drawer.Header>

                <Drawer.Body>
                    <form id="edit-chart-form" onSubmit={handleSubmit(onSubmit)}>
                        <div className="flex flex-col gap-6">
                            <div>
                                <Label htmlFor="chart-name">Name *</Label>
                                <Input
                                    id="chart-name"
                                    {...register("name", {
                                        validate: (value) => value.trim().length > 0 || "Name is required",
                                    })}
                                    placeholder="e.g., Revenue Trends"
                                />
                                {errors.name && (
                                    <Text className="text-ui-fg-error text-sm mt-1">
                                        {errors.name.message}
                                    </Text>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="chart-description">Description</Label>
                                <Textarea
                                    id="chart-description"
                                    {...register("description")}
                                    placeholder="Describe what this chart shows..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    </form>
                </Drawer.Body>
                <Drawer.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="edit-chart-form"
                        isLoading={updateMutation.isPending}
                    >
                        Save Changes
                    </Button>
                </Drawer.Footer>
            </Drawer.Content>
        </Drawer>
    )
}

// Add Series to Chart Drawer
const AddSeriesToChartDrawer = ({
    viewId,
    chartId,
    view,
    open,
    onOpenChange
}: {
    viewId: string
    chartId: string | null
    view: any
    open: boolean
    onOpenChange: (open: boolean) => void
}) => {
    const queryClient = useQueryClient()
    const [mode, setMode] = useState<'statistics' | 'presets'>('statistics')
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
    const [presetSearchQuery, setPresetSearchQuery] = useState("")

    // Get available presets
    const { data: presetsData, isLoading: isPresetsLoading } = useQuery({
        queryKey: [STATISTICS_QUERY, "presets"],
        queryFn: () => listOptions({ preset: true }),
        enabled: open && mode === 'presets',
    })

    const filteredPresets = useMemo(() => {
        const presets = presetsData?.options || []

        if (!presetSearchQuery.trim()) {
            return presets
        }

        const query = presetSearchQuery.toLowerCase().trim()

        return presets.filter((preset) => {
            const providerName = preset.provider?.display_name || preset.provider?.id || ""

            return (
                preset.local_option_name?.toLowerCase().includes(query) ||
                preset.provider_option_name?.toLowerCase().includes(query) ||
                providerName.toLowerCase().includes(query)
            )
        })
    }, [presetsData?.options, presetSearchQuery])

    const groupedPresets = useMemo(() => {
        return filteredPresets.reduce((acc, preset) => {
            const providerId = preset.provider_id || preset.provider?.id || "unknown"

            if (!acc[providerId]) {
                acc[providerId] = []
            }

            acc[providerId].push(preset)
            return acc
        }, {} as Record<string, StatisticsOption[]>)
    }, [filteredPresets])

    const createFromStatisticMutation = useMutation({
        mutationFn: async (data: {
            provider_id: string
            provider_option_name: string
            local_option_name: string
        }) => {
            // First create the statistic option
            const option = await createOption({
                view_id: viewId,
                ...data,
            })
            // Then add it to the chart
            if (chartId) {
                await addStatisticsToChart(chartId, [option.id])
            }
            return option
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views", viewId] })
            toast.success("Success", {
                description: "Series created and added to chart",
            })
            onOpenChange(false)
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to create series",
            })
        },
    })

    const cloneFromPresetMutation = useMutation({
        mutationFn: async (presetId: string) => {
            // Clone the preset to create a new option
            const clonedOption = await cloneOption(presetId, {})

            // Update the cloned option to assign it to this view
            const updatedOption = await updateOption(clonedOption.id, {
                view_id: viewId,
            })

            // Then add it to the chart
            if (chartId) {
                await addStatisticsToChart(chartId, [updatedOption.id])
            }
            return updatedOption
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views", viewId] })
            toast.success("Success", {
                description: "Preset added to chart",
            })
            onOpenChange(false)
            setSelectedPreset(null)
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to add preset",
            })
        },
    })

    const handleStatisticSelected = (data: {
        provider_id: string
        provider_option_name: string
        local_option_name: string
    }) => {
        createFromStatisticMutation.mutate(data)
    }

    const handleAddPreset = () => {
        if (!selectedPreset) return
        cloneFromPresetMutation.mutate(selectedPreset)
    }

    if (!chartId) return null

    return (
        <>
            <Drawer open={open} onOpenChange={onOpenChange}>
                <Drawer.Content>
                    <Drawer.Header>
                        <Drawer.Title>Add Series to Chart</Drawer.Title>
                        <Drawer.Description className="!txt-compact-small-plus">
                            Add a series from provider statistics or presets
                        </Drawer.Description>
                    </Drawer.Header>
                    <Drawer.Body className="overflow-y-auto">
                        {/* Tab Toggle */}
                        <div className="flex items-center border border-ui-border-base rounded-lg overflow-hidden mb-6">
                            <button
                                type="button"
                                onClick={() => setMode('statistics')}
                                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${mode === 'statistics'
                                    ? 'bg-ui-bg-base text-ui-fg-base border-r border-ui-border-base'
                                    : 'bg-ui-bg-subtle text-ui-fg-muted hover:bg-ui-bg-subtle-hover'
                                    }`}
                            >
                                Provider Statistics
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('presets')}
                                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${mode === 'presets'
                                    ? 'bg-ui-bg-base text-ui-fg-base'
                                    : 'bg-ui-bg-subtle text-ui-fg-muted hover:bg-ui-bg-subtle-hover'
                                    }`}
                            >
                                Preset Options
                            </button>
                        </div>

                        {/* Provider Statistics Tab */}
                        {mode === 'statistics' && (
                            <div className="min-h-[420px]">
                                <OptionSelector
                                    onSelect={handleStatisticSelected}
                                    enabled={open && mode === 'statistics'}
                                />
                            </div>
                        )}

                        {/* Presets Tab */}
                        {mode === 'presets' && (
                            <div className="flex min-h-[420px] flex-col gap-y-4">
                                <div className="flex flex-col gap-y-2">
                                    <Label htmlFor="preset-selector-search">Search</Label>
                                    <Input
                                        id="preset-selector-search"
                                        value={presetSearchQuery}
                                        onChange={(e) => setPresetSearchQuery(e.target.value)}
                                        placeholder="Search by preset or provider"
                                    />
                                </div>

                                {isPresetsLoading ? (
                                    <div className="text-center py-12">
                                        <Text className="text-ui-fg-muted">Loading presets...</Text>
                                    </div>
                                ) : !presetsData || presetsData.options.length === 0 ? (
                                    <div className="text-center py-12 bg-ui-bg-subtle rounded-lg">
                                        <Text className="text-ui-fg-muted">
                                            No presets available. Create presets in the Preset Library first.
                                        </Text>
                                    </div>
                                ) : filteredPresets.length === 0 ? (
                                    <div className="text-center py-12 bg-ui-bg-subtle rounded-lg">
                                        <Text className="text-ui-fg-muted">
                                            No presets match your search
                                        </Text>
                                    </div>
                                ) : (
                                    <div className="space-y-4 overflow-y-auto">
                                        {Object.entries(groupedPresets).map(([providerId, providerPresets]) => (
                                            <div
                                                key={providerId}
                                                className="border border-ui-border-base bg-ui-bg-subtle rounded-lg p-4"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <Badge>
                                                        {providerPresets[0]?.provider?.display_name || providerPresets[0]?.provider?.id || providerId}
                                                    </Badge>
                                                    <Text className="text-ui-fg-muted text-xs">
                                                        {providerPresets.length} available
                                                    </Text>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {providerPresets.map((preset) => (
                                                        <button
                                                            key={preset.id}
                                                            type="button"
                                                            onClick={() => setSelectedPreset(preset.id)}
                                                            className={`p-3 rounded-lg text-left transition-colors border ${selectedPreset === preset.id
                                                                ? 'bg-ui-bg-base border-ui-border-interactive'
                                                                : 'bg-ui-bg-base hover:bg-ui-bg-base-hover border-transparent'
                                                                }`}
                                                        >
                                                            <div className="flex-1">
                                                                <Text className="font-medium text-sm">{preset.local_option_name}</Text>
                                                                <Text className="text-ui-fg-subtle text-xs mt-1">
                                                                    {preset.provider_option_name}
                                                                </Text>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </Drawer.Body>
                    <Drawer.Footer>
                        <Button
                            variant="secondary"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        {mode === 'presets' && (
                            <Button
                                onClick={handleAddPreset}
                                isLoading={cloneFromPresetMutation.isPending}
                                disabled={!selectedPreset || cloneFromPresetMutation.isPending}
                            >
                                Add to Chart
                            </Button>
                        )}
                    </Drawer.Footer>
                </Drawer.Content>
            </Drawer>
        </>
    )
}

const ViewDetailPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const prompt = usePrompt()
    const [isEditViewOpen, setIsEditViewOpen] = useState(false)
    const [isCreateChartOpen, setIsCreateChartOpen] = useState(false)
    const [isEditChartOpen, setIsEditChartOpen] = useState(false)
    const [editingChart, setEditingChart] = useState<any>(null)
    const [isAddSeriesToChartOpen, setIsAddSeriesToChartOpen] = useState(false)
    const [addingToChartId, setAddingToChartId] = useState<string | null>(null)
    const [gridSize, setGridSize] = useState<'compact' | 'medium' | 'large'>('medium')

    // Calculation parameters
    const [periodStart, setPeriodStart] = useState(() => {
        const date = new Date()
        date.setDate(date.getDate() - 30)
        return date.toISOString().split('T')[0]
    })
    const [periodEnd, setPeriodEnd] = useState(() => {
        return new Date().toISOString().split('T')[0]
    })
    const [interval, setInterval] = useState<number>(86400) // 1 day in seconds
    const [customIntervalCount, setCustomIntervalCount] = useState<number>(1)
    const [customIntervalUnit, setCustomIntervalUnit] = useState<'m' | 'H' | 'D' | 'W' | 'M'>('D')
    const [isCustomPeriod, setIsCustomPeriod] = useState(false)
    const [isCustomInterval, setIsCustomInterval] = useState(false)
    const [currentPeriodType, setCurrentPeriodType] = useState<'rolling' | 'calendar' | 'custom'>('rolling')
    const [currentPeriodConfig, setCurrentPeriodConfig] = useState<Record<string, any>>({})
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    // Track saved values to compare against
    const [savedPeriodStart, setSavedPeriodStart] = useState<string>('')
    const [savedPeriodEnd, setSavedPeriodEnd] = useState<string>('')
    const [savedInterval, setSavedInterval] = useState<number>(86400)
    const [savedPeriodType, setSavedPeriodType] = useState<'rolling' | 'calendar' | 'custom'>('rolling')
    const [savedPeriodConfig, setSavedPeriodConfig] = useState<Record<string, any>>({})
    const [savedGridSize, setSavedGridSize] = useState<'compact' | 'medium' | 'large'>('medium')

    const selectedPeriodPresetKey = useMemo(() => {
        if (currentPeriodType === 'custom') {
            return null
        }

        const preset = PERIOD_PRESETS.find((item) => {
            if (item.type !== currentPeriodType) {
                return false
            }

            return Object.entries(item.config).every(([key, value]) => currentPeriodConfig?.[key] === value)
        })

        return preset?.key || null
    }, [currentPeriodType, currentPeriodConfig])

    const selectedIntervalPresetSeconds = useMemo(() => {
        return INTERVAL_PRESETS.some((item) => item.seconds === interval) ? interval : null
    }, [interval])

    const quickRollingPeriodPresets = PERIOD_PRESETS.filter((item) => item.quick && item.type === 'rolling')
    const quickCalendarPeriodPresets = PERIOD_PRESETS.filter((item) => item.quick && item.type === 'calendar')
    const quickIntervalPresets = INTERVAL_PRESETS.filter((item) => item.quick)

    const selectedNonQuickPeriodPreset = useMemo(
        () => PERIOD_PRESETS.find((item) => item.key === selectedPeriodPresetKey && !item.quick) || null,
        [selectedPeriodPresetKey]
    )

    const selectedNonQuickIntervalPreset = useMemo(
        () => INTERVAL_PRESETS.find((item) => item.seconds === selectedIntervalPresetSeconds && !item.quick) || null,
        [selectedIntervalPresetSeconds]
    )

    const periodPresetMap = useMemo(
        () =>
            PERIOD_PRESETS.reduce((acc, item) => {
                acc[item.key] = { type: item.type, config: item.config }
                return acc
            }, {} as Record<string, { type: 'rolling' | 'calendar' | 'custom', config: Record<string, any> }>),
        []
    )

    // Helper to convert period preset to backend structure
    const presetToBackendConfig = (preset: string): { type: 'rolling' | 'calendar' | 'custom', config: Record<string, any> } => {
        return periodPresetMap[preset] || { type: 'custom', config: {} }
    }

    // Helper to calculate dates from backend config
    const calculateDatesFromConfig = (type: string, config: Record<string, any>): { start: Date, end: Date } => {
        const now = new Date()
        let start = new Date()
        let end = new Date()

        if (type === 'rolling' && config.count && config.unit) {
            const { count, unit } = config
            switch (unit) {
                case 'days':
                    start.setDate(now.getDate() - count)
                    break
                case 'weeks':
                    start.setDate(now.getDate() - (count * 7))
                    break
                case 'months':
                    start.setMonth(now.getMonth() - count)
                    break
                case 'quarters':
                    start.setMonth(now.getMonth() - (count * 3))
                    break
                case 'years':
                    start.setFullYear(now.getFullYear() - count)
                    break
            }
        } else if (type === 'calendar' && config.reference) {
            const preset = config.reference
            switch (preset) {
                case 'today':
                    start.setHours(0, 0, 0, 0)
                    end.setHours(23, 59, 59, 999)
                    break
                case 'yesterday':
                    start.setDate(now.getDate() - 1)
                    start.setHours(0, 0, 0, 0)
                    end.setDate(now.getDate() - 1)
                    end.setHours(23, 59, 59, 999)
                    break
                case 'wtd':
                    const dayOfWeek = now.getDay()
                    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
                    start.setDate(now.getDate() - daysToMonday)
                    start.setHours(0, 0, 0, 0)
                    break
                case 'lastweek':
                    const lastWeekStart = new Date()
                    const lastWeekDay = lastWeekStart.getDay()
                    const daysToLastMonday = lastWeekDay === 0 ? 13 : lastWeekDay + 6
                    lastWeekStart.setDate(now.getDate() - daysToLastMonday)
                    lastWeekStart.setHours(0, 0, 0, 0)
                    start = lastWeekStart
                    end = new Date(lastWeekStart)
                    end.setDate(lastWeekStart.getDate() + 6)
                    end.setHours(23, 59, 59, 999)
                    break
                case 'mtd':
                    start = new Date(now.getFullYear(), now.getMonth(), 1)
                    break
                case 'lastmonth':
                    start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
                    break
                case 'qtd':
                    const quarter = Math.floor(now.getMonth() / 3)
                    start = new Date(now.getFullYear(), quarter * 3, 1)
                    break
                case 'lastquarter':
                    const lastQuarter = Math.floor(now.getMonth() / 3) - 1
                    const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear()
                    const lastQuarterMonth = lastQuarter < 0 ? 9 : lastQuarter * 3
                    start = new Date(lastQuarterYear, lastQuarterMonth, 1)
                    end = new Date(lastQuarterYear, lastQuarterMonth + 3, 0, 23, 59, 59, 999)
                    break
                case 'ytd':
                    start = new Date(now.getFullYear(), 0, 1)
                    break
                case 'lastyear':
                    start = new Date(now.getFullYear() - 1, 0, 1)
                    end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
                    break
            }
        } else if (type === 'custom' && config.start && config.end) {
            start = new Date(config.start)
            end = new Date(config.end)
        }

        return { start, end }
    }

    // Period preset helpers
    const applyPeriodPreset = (preset: string) => {
        setIsCustomPeriod(false)

        // Convert preset to backend structure
        const { type, config } = presetToBackendConfig(preset)

        // Calculate dates using the same logic as initialization
        const { start, end } = calculateDatesFromConfig(type, config)

        // Update state
        setPeriodStart(start.toISOString().split('T')[0])
        setPeriodEnd(end.toISOString().split('T')[0])
        setCurrentPeriodType(type)
        setCurrentPeriodConfig(config)
        setHasUnsavedChanges(true)
    }

    // Helper to convert unit to seconds
    const unitToSeconds = (unit: 'm' | 'H' | 'D' | 'W' | 'M'): number => {
        switch (unit) {
            case 'm': return 60
            case 'H': return 3600
            case 'D': return 86400
            case 'W': return 604800
            case 'M': return 2592000
        }
    }

    // Update interval when custom values change
    const handleCustomIntervalChange = (count: number, unit: 'm' | 'H' | 'D' | 'W' | 'M') => {
        setCustomIntervalCount(count)
        setCustomIntervalUnit(unit)
        const newInterval = count * unitToSeconds(unit)
        setInterval(newInterval)
        setHasUnsavedChanges(true)
    }

    // Apply interval preset
    const applyIntervalPreset = (seconds: number) => {
        setIsCustomInterval(false)
        setInterval(seconds)
        setHasUnsavedChanges(true)
    }

    const { data: view, isLoading } = useQuery({
        queryKey: [STATISTICS_QUERY, "views", id],
        queryFn: () => getView(id!),
        enabled: !!id,
    })

    // Initialize period config from view data
    useEffect(() => {
        if (view && view.period_type && view.period_config) {
            setCurrentPeriodType(view.period_type)
            setCurrentPeriodConfig(view.period_config)
            setSavedPeriodType(view.period_type)
            setSavedPeriodConfig(view.period_config)

            const { start, end } = calculateDatesFromConfig(view.period_type, view.period_config)
            const startStr = start.toISOString().split('T')[0]
            const endStr = end.toISOString().split('T')[0]
            setPeriodStart(startStr)
            setPeriodEnd(endStr)
            setSavedPeriodStart(startStr)
            setSavedPeriodEnd(endStr)

            if (view.period_type === 'custom') {
                setIsCustomPeriod(true)
            } else {
                setIsCustomPeriod(false)
            }
        }

        if (view && view.interval) {
            const intervalValue = view.interval
            setInterval(intervalValue)
            setSavedInterval(intervalValue)
        }

        if (view) {
            const layoutPreset = view.layout_config?.preset
            const normalizedGridSize: 'compact' | 'medium' | 'large' =
                layoutPreset === 'compact' || layoutPreset === 'medium' || layoutPreset === 'large'
                    ? layoutPreset
                    : 'medium'

            setGridSize(normalizedGridSize)
            setSavedGridSize(normalizedGridSize)
        }
    }, [view])

    // Mutation to update period configuration
    const updatePeriodConfigMutation = useMutation({
        mutationFn: (data: {
            period_type: 'rolling' | 'calendar' | 'custom'
            period_config: Record<string, any>
            interval: number
            layout_config: Record<string, any>
        }) =>
            updateView(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views", id] })
            setHasUnsavedChanges(false)
            toast.success("Success", {
                description: "Period and layout configuration saved successfully",
            })
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to save period and layout configuration",
            })
        },
    })

    // Warn user about unsaved changes before leaving
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault()
                e.returnValue = true;
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasUnsavedChanges])

    // Save period configuration
    const handleSavePeriodConfig = () => {
        updatePeriodConfigMutation.mutate({
            period_type: currentPeriodType,
            period_config: currentPeriodConfig,
            interval,
            layout_config: {
                ...(view?.layout_config ?? {}),
                preset: gridSize,
            },
        })
        setSavedPeriodStart(periodStart)
        setSavedPeriodEnd(periodEnd)
        setSavedInterval(interval)
        setSavedPeriodType(currentPeriodType)
        setSavedPeriodConfig(currentPeriodConfig)
        setSavedGridSize(gridSize)
    }

    // Discard changes and revert to saved values
    const handleDiscardChanges = () => {
        setPeriodStart(savedPeriodStart)
        setPeriodEnd(savedPeriodEnd)
        setInterval(savedInterval)
        setCurrentPeriodType(savedPeriodType)
        setCurrentPeriodConfig(savedPeriodConfig)
        setGridSize(savedGridSize)
        setHasUnsavedChanges(false)

        // Recalculate custom period state
        if (savedPeriodType === 'custom') {
            setIsCustomPeriod(true)
        } else {
            setIsCustomPeriod(false)
        }
    }

    // Auto-calculate view with current parameters
    const { data: calculationResults, isLoading: isCalculating } = useQuery({
        queryKey: [STATISTICS_QUERY, "views", id, "calculate", periodStart, periodEnd, interval],
        queryFn: async () => {
            return calculateView(id!, {
                periodStart: new Date(periodStart).toISOString(),
                periodEnd: new Date(periodEnd).toISOString(),
                interval: interval,
            })
        },
        enabled: !!id && !!view && !!periodStart && !!periodEnd,
        retry: false,
    })

    // Extract cache statistics from metadata
    const cacheStats = useMemo(() => {
        if (!calculationResults?.metadata) return null

        const metadata = calculationResults.metadata
        const totalStats = Object.keys(metadata).length
        const cachedStats = Object.values(metadata).filter((m: any) => m.fromCache).length
        const oldestCache = Object.values(metadata)
            .filter((m: any) => m.fromCache && m.cachedAt)
            .map((m: any) => new Date(m.cachedAt))
            .sort((a, b) => a.getTime() - b.getTime())[0]

        return {
            totalStats,
            cachedStats,
            freshStats: totalStats - cachedStats,
            oldestCache
        }
    }, [calculationResults?.metadata])

    const deleteMutation = useMutation({
        mutationFn: () => deleteView(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views"] })
            navigate("/statistics/views")
        },
    })

    const handleDelete = async () => {
        const confirmed = await prompt({
            title: "Delete view?",
            description: `Are you sure you want to delete "${view?.name}"?`,
            variant: "danger",
            confirmText: "Delete",
        })

        if (!confirmed) {
            return
        }

        deleteMutation.mutate()
    }

    // Delete chart mutation
    const deleteChartMutation = useMutation({
        mutationFn: (chartId: string) => deleteChart(chartId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views", id] })
            toast.success("Success", {
                description: "Chart deleted successfully",
            })
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to delete chart",
            })
        },
    })

    const handleDeleteChart = async (chartId: string, chartName: string) => {
        const confirmed = await prompt({
            title: "Delete chart?",
            description: `Are you sure you want to delete "${chartName}"? Statistics in this chart will not be deleted.`,
            variant: "danger",
            confirmText: "Delete",
        })

        if (!confirmed) {
            return
        }

        deleteChartMutation.mutate(chartId)
    }

    const handleEditChart = (chart: any) => {
        setEditingChart(chart)
        setIsEditChartOpen(true)
    }

    const handleAddSeriesToChart = (chartId: string) => {
        setAddingToChartId(chartId)
        setIsAddSeriesToChartOpen(true)
    }

    if (isLoading) {
        return (
            <Container className="p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-64" />
                </div>
                <Skeleton className="h-48 w-full" />
            </Container>
        )
    }

    if (!view) {
        return (
            <Container className="p-6">
                <Text>View not found</Text>
            </Container>
        )
    }

    return (
        <>
            <EditViewModal view={view} open={isEditViewOpen} onOpenChange={setIsEditViewOpen} />
            <CreateChartModal viewId={view.id} open={isCreateChartOpen} onOpenChange={setIsCreateChartOpen} />
            <EditChartModal chart={editingChart} open={isEditChartOpen} onOpenChange={setIsEditChartOpen} />
            <AddSeriesToChartDrawer
                viewId={view.id}
                chartId={addingToChartId}
                view={view}
                open={isAddSeriesToChartOpen}
                onOpenChange={setIsAddSeriesToChartOpen}
            />

            <div className="flex flex-col gap-6">
                {/* Header */}
                <Container className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div>
                                <Heading level="h1">{view.name}</Heading>
                                {view.description && (
                                    <Text className="text-ui-fg-subtle">{view.description}</Text>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasUnsavedChanges && (
                                <>
                                    <Button
                                        size="small"
                                        variant="secondary"
                                        onClick={handleDiscardChanges}
                                    >
                                        Discard
                                    </Button>
                                    <Button
                                        size="small"
                                        onClick={handleSavePeriodConfig}
                                        isLoading={updatePeriodConfigMutation.isPending}
                                    >
                                        Save
                                    </Button>
                                </>
                            )}
                            <DropdownMenu>
                                <DropdownMenu.Trigger asChild>
                                    <IconButton size="small">
                                        <EllipsisHorizontal />
                                    </IconButton>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Content>
                                    <DropdownMenu.Item onClick={() => setIsEditViewOpen(true)}>
                                        <PencilSquare className="mr-2" />
                                        Edit View
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item onClick={() => console.log("Clone")}>
                                        <DocumentDuplicate className="mr-2" />
                                        Clone View
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Separator />
                                    <DropdownMenu.Item onClick={handleDelete} className="text-ui-fg-error">
                                        <Trash className="mr-2" />
                                        Delete View
                                    </DropdownMenu.Item>
                                </DropdownMenu.Content>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Calculation Period Controls */}
                    <div className="border-t border-ui-border-base pt-4 mt-4">
                        {/* Period Presets */}
                        <div className="mb-4">
                            <Label size="small" className="mb-2">Period</Label>
                            <div className="flex items-center gap-2">
                                {/* Quick presets as buttons */}
                                <div className="flex items-center border border-ui-border-base rounded-lg overflow-hidden">
                                    <div
                                        className={`flex items-center px-3 py-1.5 text-sm transition-colors border-r bg-ui-bg-disabled text-ui-fg-base `}
                                    >
                                        Rolling
                                    </div>
                                    {quickRollingPeriodPresets.map((preset) => (
                                        <button
                                            key={preset.key}
                                            type="button"
                                            onClick={() => applyPeriodPreset(preset.key)}
                                            className={`px-3 py-1.5 text-sm transition-colors border-r border-ui-border-base ${selectedPeriodPresetKey === preset.key
                                                ? 'bg-ui-bg-base text-ui-fg-base'
                                                : 'bg-ui-bg-subtle text-ui-fg-muted hover:bg-ui-bg-subtle-hover'
                                                }`}
                                        >
                                            {preset.quickLabel}
                                        </button>
                                    ))}
                                    <div
                                        className={`flex items-center px-3 py-1.5 text-sm transition-colors border-r border-l bg-ui-bg-disabled text-ui-fg-base`}
                                    >
                                        Calendar
                                    </div>
                                    {quickCalendarPeriodPresets.map((preset) => (
                                        <button
                                            key={preset.key}
                                            type="button"
                                            onClick={() => applyPeriodPreset(preset.key)}
                                            className={`px-3 py-1.5 text-sm transition-colors border-r border-ui-border-base ${selectedPeriodPresetKey === preset.key
                                                ? 'bg-ui-bg-base text-ui-fg-base'
                                                : 'bg-ui-bg-subtle text-ui-fg-muted hover:bg-ui-bg-subtle-hover'
                                                }`}
                                        >
                                            {preset.quickLabel}
                                        </button>
                                    ))}
                                    {selectedNonQuickPeriodPreset && (
                                        <button
                                            type="button"
                                            onClick={() => applyPeriodPreset(selectedNonQuickPeriodPreset.key)}
                                            className="px-3 py-1.5 text-sm transition-colors bg-ui-bg-base text-ui-fg-base"
                                        >
                                            {selectedNonQuickPeriodPreset.quickLabel}
                                        </button>
                                    )}
                                </div>

                                {/* More options dropdown */}
                                <DropdownMenu>
                                    <DropdownMenu.Trigger asChild>
                                        <Button size="small" variant="secondary">
                                            <EllipsisHorizontal />
                                        </Button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content>
                                        <DropdownMenu.Label className="px-2">Rolling Periods</DropdownMenu.Label>
                                        {PERIOD_PRESETS
                                            .filter((preset) => preset.type === 'rolling')
                                            .map((preset) => (
                                                <DropdownMenu.Item key={preset.key} onClick={() => applyPeriodPreset(preset.key)}>
                                                    {preset.label}
                                                </DropdownMenu.Item>
                                            ))}

                                        <DropdownMenu.Separator />
                                        <DropdownMenu.Label className="px-2">Calendar Periods</DropdownMenu.Label>
                                        {PERIOD_PRESETS
                                            .filter((preset) => preset.type === 'calendar')
                                            .map((preset) => (
                                                <DropdownMenu.Item key={preset.key} onClick={() => applyPeriodPreset(preset.key)}>
                                                    {preset.label}
                                                </DropdownMenu.Item>
                                            ))}

                                        <DropdownMenu.Separator />
                                        <DropdownMenu.Item onClick={() => {
                                            setIsCustomPeriod(true)
                                        }}>
                                            Custom Range...
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu>
                            </div>
                        </div>

                        {isCustomPeriod && (
                            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label size="small" htmlFor="periodStart">Start Date</Label>
                                    <Input
                                        id="periodStart"
                                        type="date"
                                        value={periodStart}
                                        onChange={(e) => {
                                            setPeriodStart(e.target.value)
                                            const customConfig = {
                                                start: e.target.value,
                                                end: periodEnd
                                            }
                                            setCurrentPeriodType('custom')
                                            setCurrentPeriodConfig(customConfig)
                                            setHasUnsavedChanges(true)
                                        }}
                                    />
                                </div>
                                <div>
                                    <Label size="small" htmlFor="periodEnd">End Date</Label>
                                    <Input
                                        id="periodEnd"
                                        type="date"
                                        value={periodEnd}
                                        onChange={(e) => {
                                            setPeriodEnd(e.target.value)
                                            const customConfig = {
                                                start: periodStart,
                                                end: e.target.value
                                            }
                                            setCurrentPeriodType('custom')
                                            setCurrentPeriodConfig(customConfig)
                                            setHasUnsavedChanges(true)
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="">
                            <Label size="small" className="mb-2">Interval</Label>
                            <div className="flex items-center gap-2">
                                {/* Quick presets as buttons */}
                                <div className="flex items-center border border-ui-border-base rounded-lg overflow-hidden">
                                    {quickIntervalPresets.map((preset) => (
                                        <button
                                            key={preset.seconds}
                                            type="button"
                                            onClick={() => applyIntervalPreset(preset.seconds)}
                                            className={`px-3 py-1.5 text-sm transition-colors border-r border-ui-border-base ${selectedIntervalPresetSeconds === preset.seconds
                                                ? 'bg-ui-bg-base text-ui-fg-base'
                                                : 'bg-ui-bg-subtle text-ui-fg-muted hover:bg-ui-bg-subtle-hover'
                                                }`}
                                        >
                                            {preset.quickLabel}
                                        </button>
                                    ))}
                                    {selectedNonQuickIntervalPreset && (
                                        <button
                                            type="button"
                                            onClick={() => applyIntervalPreset(selectedNonQuickIntervalPreset.seconds)}
                                            className="px-3 py-1.5 text-sm transition-colors bg-ui-bg-base text-ui-fg-base"
                                        >
                                            {selectedNonQuickIntervalPreset.quickLabel}
                                        </button>
                                    )}
                                </div>

                                {/* More options dropdown */}
                                <DropdownMenu>
                                    <DropdownMenu.Trigger asChild>
                                        <Button size="small" variant="secondary">
                                            <EllipsisHorizontal />
                                        </Button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content>
                                        <DropdownMenu.Label className="px-2">Time Intervals</DropdownMenu.Label>
                                        {INTERVAL_PRESETS.map((preset) => (
                                            <DropdownMenu.Item key={preset.seconds} onClick={() => applyIntervalPreset(preset.seconds)}>
                                                {preset.label}
                                            </DropdownMenu.Item>
                                        ))}

                                        <DropdownMenu.Separator />
                                        <DropdownMenu.Item onClick={() => {
                                            setIsCustomInterval(true)
                                        }}>
                                            Custom Interval...
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu>
                            </div>
                        </div>

                        {isCustomInterval && (
                            <div className="mt-2 flex gap-2">
                                <Input
                                    type="number"
                                    min="1"
                                    value={customIntervalCount}
                                    onChange={(e) => handleCustomIntervalChange(Number(e.target.value) || 1, customIntervalUnit)}
                                    className="w-20"
                                    placeholder="#"
                                />
                                <Select
                                    value={customIntervalUnit}
                                    onValueChange={(val: 'm' | 'H' | 'D' | 'W' | 'M') => handleCustomIntervalChange(customIntervalCount, val)}
                                >
                                    <Select.Trigger>
                                        <Select.Value />
                                    </Select.Trigger>
                                    <Select.Content>
                                        <Select.Item value="m">Minutes</Select.Item>
                                        <Select.Item value="H">Hours</Select.Item>
                                        <Select.Item value="D">Days</Select.Item>
                                        <Select.Item value="W">Weeks</Select.Item>
                                        <Select.Item value="M">Months</Select.Item>
                                    </Select.Content>
                                </Select>
                            </div>
                        )}
                        {isCalculating && (
                            <div className="mt-4 flex items-center gap-2 text-sm text-ui-fg-muted">
                                <div className="animate-spin h-4 w-4 border-2 border-ui-fg-muted border-t-transparent rounded-full" />
                                <Text>Calculating statistics...</Text>
                            </div>
                        )}
                        {!isCalculating && calculationResults?.duration !== undefined && (
                            <div className="mt-4 space-y-1">
                                <div className="text-sm text-ui-fg-subtle">
                                    <Text className="text-xs">
                                        Done in {calculationResults.duration.toFixed(2)} seconds.
                                        {cacheStats && cacheStats.cachedStats > 0 && `(cache time: ${formatDate(cacheStats.oldestCache, "dd.MM.yyyy HH:mm:ss")})`}
                                    </Text>
                                </div>
                            </div>
                        )}
                    </div>
                </Container>

                {/* Charts Section */}
                <Container className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Heading level="h2">Charts ({view.charts?.length || 0})</Heading>
                        <div className="flex items-center gap-2">
                            {/* Grid size adjustment buttons */}
                            <div className="flex items-center border border-ui-border-base rounded-lg overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (gridSize !== 'compact') {
                                            setGridSize('compact')
                                            setHasUnsavedChanges(true)
                                        }
                                    }}
                                    className={`px-3 py-1.5 text-sm transition-colors border-r border-ui-border-base ${gridSize === 'compact'
                                        ? 'bg-ui-bg-base text-ui-fg-base'
                                        : 'bg-ui-bg-subtle text-ui-fg-muted hover:bg-ui-bg-subtle-hover'
                                        }`}
                                >
                                    Compact
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (gridSize !== 'medium') {
                                            setGridSize('medium')
                                            setHasUnsavedChanges(true)
                                        }
                                    }}
                                    className={`px-3 py-1.5 text-sm transition-colors border-r border-ui-border-base ${gridSize === 'medium'
                                        ? 'bg-ui-bg-base text-ui-fg-base'
                                        : 'bg-ui-bg-subtle text-ui-fg-muted hover:bg-ui-bg-subtle-hover'
                                        }`}
                                >
                                    Medium
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (gridSize !== 'large') {
                                            setGridSize('large')
                                            setHasUnsavedChanges(true)
                                        }
                                    }}
                                    className={`px-3 py-1.5 text-sm transition-colors ${gridSize === 'large'
                                        ? 'bg-ui-bg-base text-ui-fg-base'
                                        : 'bg-ui-bg-subtle text-ui-fg-muted hover:bg-ui-bg-subtle-hover'
                                        }`}
                                >
                                    Large
                                </button>
                            </div>
                            <Button size="small" variant="secondary" onClick={() => setIsCreateChartOpen(true)}>
                                Create
                            </Button>
                        </div>
                    </div>
                    <div className={`grid gap-4 ${gridSize === 'compact' ? 'grid-cols-1 md:grid-cols-3' :
                        gridSize === 'large' ? 'grid-cols-1' :
                            'grid-cols-1 md:grid-cols-2'
                        }`}>
                        {view.charts?.map((chart) => (
                            <ChartCard
                                key={chart.id}
                                chart={chart}
                                viewId={view.id}
                                results={calculationResults?.results}
                                definitions={calculationResults?.definitions}
                                isCalculating={isCalculating}
                                interval={interval}
                                onEdit={() => handleEditChart(chart)}
                                onDelete={() => handleDeleteChart(chart.id, chart.name)}
                                onAddSeries={() => handleAddSeriesToChart(chart.id)}
                            />
                        ))}
                    </div>
                </Container>
            </div>
        </>
    )
}

export const config = defineRouteConfig({
    label: "View Details",
})

export default ViewDetailPage
