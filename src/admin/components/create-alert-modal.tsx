import { useCallback, useState, useEffect } from "react"
import {
    Button,
    FocusModal,
    Input,
    Label,
    Textarea,
    Text,
    Select,
    ProgressTabs,
    Table,
    StatusBadge,
    Badge,
} from "@medusajs/ui"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { STATISTICS_QUERY } from "../lib/queries"
import {
    listProviders,
    getProviderStatistics,
    createOption,
    updateAlert,
    listOptions,
    cloneOption,
    createAlert,
    type StatisticsProvider,
    type AvailableStatistic,
    type StatisticsOption,
    type StatisticsAlert,
    type ParameterFieldDefinition,
} from "../lib/statistics/api"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ChevronDownMini, ChevronUpMini, Adjustments as AdjustmentsHorizontal } from "@medusajs/icons"
import { ParameterInput } from "./parameter-input"

type IntervalUnit = "seconds" | "minutes" | "hours" | "days" | "weeks"

const INTERVAL_UNIT_SECONDS: Record<IntervalUnit, number> = {
    seconds: 1,
    minutes: 60,
    hours: 3600,
    days: 86400,
    weeks: 604800,
}

const intervalFromSeconds = (seconds: number): { value: number; unit: IntervalUnit } => {
    const normalizedSeconds = Math.max(1, Math.floor(seconds || 0))

    const units: IntervalUnit[] = ["weeks", "days", "hours", "minutes", "seconds"]

    for (const unit of units) {
        const factor = INTERVAL_UNIT_SECONDS[unit]
        if (normalizedSeconds % factor === 0) {
            return {
                value: Math.max(1, normalizedSeconds / factor),
                unit,
            }
        }
    }

    return { value: normalizedSeconds, unit: "seconds" }
}

const intervalToSeconds = (value: number, unit: IntervalUnit): number => {
    const normalizedValue = Math.max(1, Math.floor(value || 0))
    return normalizedValue * INTERVAL_UNIT_SECONDS[unit]
}

const alertSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    severity: z.enum(["info", "warning", "critical"]),
    selection_mode: z.enum(["statistics", "presets"]).default("statistics"),
    provider_id: z.string().optional(),
    statistic_id: z.string().optional(),
    preset_option_id: z.string().optional(),
    parameters: z.record(z.any()),
    operator: z.enum(["gt", "lt", "gte", "lte", "eq", "neq", "between"]),
    threshold: z.union([z.number(), z.tuple([z.number(), z.number()])]),
    comparison_type: z.enum(["absolute", "relative"]),
    change_type: z.enum(["absolute", "percentage"]).optional(),
    lookback_positions: z.number().optional(),
    interval: z.number().min(1, "Interval is required"),
    is_enabled: z.boolean().default(true),
})

type AlertFormData = z.infer<typeof alertSchema>

const Skeleton = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse bg-ui-bg-component rounded ${className}`} />
)

interface ProviderSelectionProps {
    form: any
    providers: StatisticsProvider[]
    isLoading: boolean
}

const ProviderSelection = ({ form, providers, isLoading }: ProviderSelectionProps) => {
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null)

    const selectedProviderId = form.watch("provider_id")
    const selectedStatisticId = form.watch("statistic_id")

    const { data: statisticsData } = useQuery({
        queryKey: [STATISTICS_QUERY, "provider-statistics", expandedProvider],
        queryFn: () => expandedProvider ? getProviderStatistics(expandedProvider) : null,
        enabled: !!expandedProvider,
    })

    const handleSelectStatistic = (providerId: string, statistic: AvailableStatistic) => {
        form.setValue("provider_id", providerId)
        form.setValue("statistic_id", statistic.id)


        const defaultParams: Record<string, any> = {}
        if (statistic.parameters?.fields) {
            statistic.parameters.fields.forEach((field: ParameterFieldDefinition) => {
                if (statistic.parameters.defaults?.[field.name] !== undefined) {
                    defaultParams[field.name] = statistic.parameters.defaults[field.name]
                }
            })
        }
        form.setValue("parameters", defaultParams)
    }

    return (
        <div className="space-y-4 overflow-y-auto">
            <div>
                <h3 className="text-sm font-medium mb-3">Select Provider and Statistic</h3>
                <Table>
                    <Table.Header>
                        <Table.Row>
                            <Table.HeaderCell>Provider</Table.HeaderCell>
                            <Table.HeaderCell>Statistics</Table.HeaderCell>
                            <Table.HeaderCell>Status</Table.HeaderCell>
                            <Table.HeaderCell></Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {isLoading ? (
                            <Table.Row>
                                <Table.Cell>
                                    <Skeleton className="h-10 w-full" />
                                </Table.Cell>
                                <Table.Cell />
                                <Table.Cell />
                                <Table.Cell />
                            </Table.Row>
                        ) : (
                            providers.map((provider) => {
                                const isExpanded = expandedProvider === provider.id
                                const statistics = statisticsData?.statistics || []

                                return (
                                    <>
                                        <Table.Row
                                            key={provider.id}
                                            className="cursor-pointer"
                                            onClick={() => {
                                                setExpandedProvider(isExpanded ? null : provider.id)
                                            }}
                                        >
                                            <Table.Cell>
                                                <div className="flex items-center gap-3 py-2">
                                                    <div className="bg-ui-bg-subtle border rounded-lg p-2">
                                                        <AdjustmentsHorizontal className="text-ui-fg-muted" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">
                                                            {provider.display_name || provider.id}
                                                        </p>
                                                        <p className="text-ui-fg-muted text-xs">{provider.id}</p>
                                                    </div>
                                                </div>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <span className="text-xs text-ui-fg-subtle">
                                                    {statistics.length || 0} available
                                                </span>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <StatusBadge color={provider.is_enabled ? "green" : "grey"}>
                                                    {provider.is_enabled ? "Active" : "Disabled"}
                                                </StatusBadge>
                                            </Table.Cell>
                                            <Table.Cell className="text-right">
                                                {isExpanded ? (
                                                    <ChevronUpMini className="inline-block text-ui-fg-muted" />
                                                ) : (
                                                    <ChevronDownMini className="inline-block text-ui-fg-muted" />
                                                )}
                                            </Table.Cell>
                                        </Table.Row>
                                        {isExpanded && (
                                            <Table.Row className="bg-ui-bg-subtle hover:bg-ui-bg-subtle">

                                                <Table.Cell colSpan={4}>
                                                    <div className="space-y-2 py-4">
                                                        <h4 className="text-sm font-medium mb-3">
                                                            Available Statistics
                                                        </h4>
                                                        <div className="grid gap-2">
                                                            {statistics.map((stat: AvailableStatistic) => (
                                                                <div
                                                                    key={stat.id}
                                                                    className={`bg-ui-bg-base rounded-lg p-3 border cursor-pointer hover:border-ui-border-interactive ${selectedProviderId === provider.id &&
                                                                        selectedStatisticId === stat.id
                                                                        ? "border-ui-border-interactive"
                                                                        : "border-ui-border-base"
                                                                        }`}
                                                                    onClick={() =>
                                                                        handleSelectStatistic(provider.id, stat)
                                                                    }
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex-1">
                                                                            <p className="font-medium text-sm">
                                                                                {stat.name || stat.id}
                                                                            </p>
                                                                            <p className="text-xs text-ui-fg-muted mt-1">
                                                                                {stat.id}
                                                                            </p>
                                                                            {stat.description && (
                                                                                <p className="text-xs text-ui-fg-subtle mt-2">
                                                                                    {stat.description}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        {selectedProviderId === provider.id &&
                                                                            selectedStatisticId === stat.id && (
                                                                                <Badge color="green" size="small">
                                                                                    Selected
                                                                                </Badge>
                                                                            )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </Table.Cell>
                                            </Table.Row>
                                        )}
                                    </>
                                )
                            })
                        )}
                    </Table.Body>
                </Table>
            </div>
        </div>
    )
}

interface ParameterInputsProps {
    form: any
}

const ParameterInputs = ({ form }: ParameterInputsProps) => {
    const selectionMode = form.watch("selection_mode")
    const selectedProviderId = form.watch("provider_id")
    const selectedStatisticId = form.watch("statistic_id")
    const selectedPresetOptionId = form.watch("preset_option_id")
    const currentParams = form.watch("parameters") || {}

    const { data: presetsData } = useQuery({
        queryKey: [STATISTICS_QUERY, "presets", "for-alerts"],
        queryFn: () => listOptions({ limit: 100, offset: 0, preset: true }),
        enabled: selectionMode === "presets",
    })

    if (selectionMode === "presets") {
        const selectedPreset = presetsData?.options?.find((preset: StatisticsOption) => preset.id === selectedPresetOptionId)

        if (!selectedPreset) {
            return (
                <div className="text-center text-ui-fg-muted py-8">
                    Please select a preset option first
                </div>
            )
        }

        return (
            <div className="space-y-4">
                <div className="bg-ui-bg-subtle rounded-lg p-4">
                    <p className="text-sm font-medium mb-1">{selectedPreset.local_option_name}</p>
                    <p className="text-xs text-ui-fg-subtle">{selectedPreset.provider_option_name}</p>
                </div>
                <Text className="text-ui-fg-subtle text-sm">
                    This alert uses a cloned preset option. Parameter configuration is copied from the selected preset.
                </Text>
            </div>
        )
    }

    const { data: statisticsData } = useQuery({
        queryKey: [STATISTICS_QUERY, "provider-statistics", selectedProviderId],
        queryFn: () => selectedProviderId ? getProviderStatistics(selectedProviderId) : null,
        enabled: !!selectedProviderId,
    })

    const selectedStatistic = statisticsData?.statistics?.find(
        (stat: AvailableStatistic) => stat.id === selectedStatisticId
    )

    if (!selectedStatistic) {
        return (
            <div className="text-center text-ui-fg-muted py-8">
                Please select a statistic first
            </div>
        )
    }

    if (!selectedStatistic.parameters?.fields || selectedStatistic.parameters.fields.length === 0) {
        return (
            <div className="text-center text-ui-fg-muted py-8">
                This statistic does not require any parameters
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="bg-ui-bg-subtle rounded-lg p-4 mb-4">
                <p className="text-sm font-medium mb-1">{selectedStatistic.name || selectedStatistic.id}</p>
                {selectedStatistic.description && (
                    <p className="text-xs text-ui-fg-subtle">{selectedStatistic.description}</p>
                )}
            </div>

            <h3 className="text-sm font-medium mb-3">Configure Parameters</h3>
            <div className="space-y-4">
                {selectedStatistic.parameters.fields.map((field: ParameterFieldDefinition) => (
                    <ParameterInput
                        key={field.name}
                        field={field}
                        value={currentParams[field.name]}
                        onChange={(value: any) => form.setValue(`parameters.${field.name}`, value)}
                    />
                ))}
            </div>
        </div>
    )
}

interface CreateAlertModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialAlert?: StatisticsAlert | null
}

export const CreateAlertModal = ({ open, onOpenChange, initialAlert = null }: CreateAlertModalProps) => {
    const queryClient = useQueryClient()
    const [currentTab, setCurrentTab] = useState("info")
    const isEditMode = !!initialAlert

    const form = useForm<AlertFormData>({
        resolver: zodResolver(alertSchema),
        defaultValues: {
            name: "",
            description: "",
            severity: "info",
            selection_mode: "statistics",
            provider_id: "",
            statistic_id: "",
            preset_option_id: "",
            parameters: {},
            operator: "gt",
            threshold: 0,
            comparison_type: "absolute",
            change_type: "absolute",
            lookback_positions: 1,
            interval: 86400,
            is_enabled: true,
        },
    })

    const [intervalValue, setIntervalValue] = useState(1)
    const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>("days")

    const { data: providersData, isLoading: isLoadingProviders } = useQuery({
        queryKey: [STATISTICS_QUERY, "providers"],
        queryFn: () => listProviders(),
    })

    const selectionMode = form.watch("selection_mode")

    const { data: presetsData, isLoading: isLoadingPresets } = useQuery({
        queryKey: [STATISTICS_QUERY, "presets", "for-alerts"],
        queryFn: () => listOptions({ limit: 100, offset: 0, preset: true }),
        enabled: selectionMode === "presets",
    })

    useEffect(() => {
        const currentInterval = form.getValues("interval") || 86400
        const parsed = intervalFromSeconds(currentInterval)
        setIntervalValue(parsed.value)
        setIntervalUnit(parsed.unit)
    }, [open, form])

    useEffect(() => {
        if (!open) {
            return
        }

        if (isEditMode && initialAlert) {
            const thresholdValue = initialAlert.condition?.threshold
            const normalizedThreshold = Array.isArray(thresholdValue)
                ? [Number(thresholdValue[0] || 0), Number(thresholdValue[1] || 0)] as [number, number]
                : Number(thresholdValue ?? 0)

            const alertInterval = Math.max(1, Number(initialAlert.interval || 86400))
            const parsedInterval = intervalFromSeconds(alertInterval)

            form.reset({
                name: initialAlert.name || "",
                description: initialAlert.description || "",
                severity: initialAlert.severity || "info",
                selection_mode: initialAlert.option?.preset ? "presets" : "statistics",
                provider_id: initialAlert.option?.provider_id || "",
                statistic_id: initialAlert.option?.provider_option_name || "",
                preset_option_id: initialAlert.option?.preset ? initialAlert.option.id : "",
                parameters: initialAlert.option?.data || {},
                operator: initialAlert.condition?.operator || "gt",
                threshold: normalizedThreshold,
                comparison_type: initialAlert.condition?.comparisonType || "absolute",
                change_type: initialAlert.condition?.changeType || "absolute",
                lookback_positions: Number(initialAlert.condition?.lookbackPositions || 1),
                interval: alertInterval,
                is_enabled: initialAlert.is_enabled,
            })

            setIntervalValue(parsedInterval.value)
            setIntervalUnit(parsedInterval.unit)
            setCurrentTab("info")
            return
        }

        form.reset({
            name: "",
            description: "",
            severity: "info",
            selection_mode: "statistics",
            provider_id: "",
            statistic_id: "",
            preset_option_id: "",
            parameters: {},
            operator: "gt",
            threshold: 0,
            comparison_type: "absolute",
            change_type: "absolute",
            lookback_positions: 1,
            interval: 86400,
            is_enabled: true,
        })
        setIntervalValue(1)
        setIntervalUnit("days")
        setCurrentTab("info")
    }, [open, isEditMode, initialAlert, form])

    useEffect(() => {
        form.setValue("interval", intervalToSeconds(intervalValue, intervalUnit))
    }, [intervalValue, intervalUnit, form])


    const operator = form.watch("operator")
    useEffect(() => {
        const currentThreshold = form.getValues("threshold")

        if (operator === "between") {

            if (!Array.isArray(currentThreshold)) {
                form.setValue("threshold", [0, currentThreshold || 0] as [number, number])
            }
        } else {

            if (Array.isArray(currentThreshold)) {
                form.setValue("threshold", currentThreshold[0] || 0)
            }
        }
    }, [operator, form])

    const submitMutation = useMutation({
        mutationFn: async (data: AlertFormData) => {
            if (isEditMode && initialAlert) {
                return updateAlert(initialAlert.id, {
                    name: data.name,
                    description: data.description,
                    condition: {
                        operator: data.operator,
                        threshold: data.threshold,
                        comparisonType: data.comparison_type,
                        changeType: data.change_type,
                        lookbackPositions: data.lookback_positions,
                    },
                    interval: data.interval,
                    severity: data.severity,
                    is_enabled: data.is_enabled,
                })
            }

            let optionId: string

            if (data.selection_mode === "presets") {
                if (!data.preset_option_id) {
                    throw new Error("Preset option is required")
                }

                const clonedOption = await cloneOption(data.preset_option_id, {
                    local_option_name: data.name,
                    preset: false,
                })

                optionId = clonedOption.id
            } else {
                if (!data.provider_id || !data.statistic_id) {
                    throw new Error("Provider and statistic are required")
                }

                const option = await createOption({
                    provider_id: data.provider_id,
                    provider_option_name: data.statistic_id,
                    local_option_name: data.name,
                    data: data.parameters,
                })

                optionId = option.id
            }

            return createAlert({
                name: data.name,
                description: data.description,
                option_id: optionId,
                condition: {
                    operator: data.operator,
                    threshold: data.threshold,
                    comparisonType: data.comparison_type,
                    changeType: data.change_type,
                    lookbackPositions: data.lookback_positions,
                },
                interval: data.interval,
                severity: data.severity,
                is_enabled: data.is_enabled,
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "alerts"] })
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "options"] })
            onOpenChange(false)
            form.reset()
            setIntervalValue(1)
            setIntervalUnit("days")
            setCurrentTab("info")
        },
    })

    const onSubmit = (data: AlertFormData) => {
        submitMutation.mutate(data)
    }

    const tabs = [
        { value: "info", label: "Alert Information" },
        { value: "statistic", label: "Statistic Selection" },
        { value: "parameters", label: "Parameters" },
        { value: "condition", label: "Alert Condition" },
    ]

    const nameWatch = form.watch("name")
    const severityWatch = form.watch("severity")
    const statisticIdWatch = form.watch("statistic_id")
    const presetOptionIdWatch = form.watch("preset_option_id")

    const canProceed = useCallback((tab: string) => {
        switch (tab) {
            case "info":
                return nameWatch && severityWatch
            case "statistic":
                return selectionMode === "presets" ? !!presetOptionIdWatch : !!statisticIdWatch
            case "parameters":
                return true
            case "condition":
                return true
            default:
                return false
        }
    }, [nameWatch, severityWatch, statisticIdWatch, presetOptionIdWatch, selectionMode]);

    const getTabStatus = (tabValue: string) => {
        const currentIndex = tabs.findIndex((t) => t.value === currentTab)
        const tabIndex = tabs.findIndex((t) => t.value === tabValue)

        if (tabIndex < currentIndex) {
            return canProceed(tabValue) ? "completed" : "not-started"
        } else if (tabIndex === currentIndex) {
            return "in-progress"
        } else {
            return "not-started"
        }
    }

    return (
        <FocusModal open={open} onOpenChange={onOpenChange}>
            <FocusModal.Content>
                <FocusModal.Header>
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <FocusModal.Title>{isEditMode ? "Edit Alert" : "Create Alert"}</FocusModal.Title>
                            <FocusModal.Description className="!txt-compact-small-plus text-ui-fg-muted text-sm">
                                {isEditMode
                                    ? "Update alert configuration and thresholds"
                                    : "Set up a new alert to monitor statistics"}
                            </FocusModal.Description>
                        </div>
                    </div>
                </FocusModal.Header>

                <FocusModal.Body className="flex flex-col overflow-hidden">
                    <ProgressTabs value={currentTab}>
                        <ProgressTabs.List className="border-b">
                            {tabs.map((tab) => (
                                <ProgressTabs.Trigger
                                    key={tab.value}
                                    value={tab.value}
                                    disabled={true}
                                    status={getTabStatus(tab.value)}
                                >
                                    {tab.label}
                                </ProgressTabs.Trigger>
                            ))}
                        </ProgressTabs.List>

                        <div className="flex-1 overflow-y-auto p-6">
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <ProgressTabs.Content value="info">
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="name">Alert Name *</Label>
                                            <Input
                                                id="name"
                                                {...form.register("name")}
                                                placeholder="e.g., Low Revenue Alert"
                                            />
                                            {form.formState.errors.name && (
                                                <Text className="text-ui-fg-error text-sm mt-1">
                                                    {form.formState.errors.name.message}
                                                </Text>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="description">Description</Label>
                                            <Textarea
                                                id="description"
                                                {...form.register("description")}
                                                placeholder="Describe when this alert should trigger..."
                                                rows={3}
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="severity">Severity *</Label>
                                            <Controller
                                                name="severity"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <Select {...field} onValueChange={field.onChange}>
                                                        <Select.Trigger>
                                                            <Select.Value />
                                                        </Select.Trigger>
                                                        <Select.Content>
                                                            <Select.Item value="info">Info</Select.Item>
                                                            <Select.Item value="warning">Warning</Select.Item>
                                                            <Select.Item value="critical">Critical</Select.Item>
                                                        </Select.Content>
                                                    </Select>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </ProgressTabs.Content>

                                <ProgressTabs.Content value="statistic">
                                    <div className="space-y-4 overflow-hidden">
                                        <div className="flex items-center border border-ui-border-base rounded-lg overflow-hidden">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    form.setValue("selection_mode", "statistics")
                                                    form.setValue("preset_option_id", "")
                                                }}
                                                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${selectionMode === "statistics"
                                                    ? "bg-ui-bg-base text-ui-fg-base border-r border-ui-border-base"
                                                    : "bg-ui-bg-subtle text-ui-fg-muted hover:bg-ui-bg-subtle-hover"
                                                    }`}
                                            >
                                                Provider Statistics
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    form.setValue("selection_mode", "presets")
                                                    form.setValue("provider_id", "")
                                                    form.setValue("statistic_id", "")
                                                    form.setValue("parameters", {})
                                                }}
                                                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${selectionMode === "presets"
                                                    ? "bg-ui-bg-base text-ui-fg-base"
                                                    : "bg-ui-bg-subtle text-ui-fg-muted hover:bg-ui-bg-subtle-hover"
                                                    }`}
                                            >
                                                Preset Options
                                            </button>
                                        </div>

                                        {selectionMode === "statistics" ? (
                                            <ProviderSelection
                                                form={form}
                                                providers={providersData?.providers || []}
                                                isLoading={isLoadingProviders}
                                            />
                                        ) : (
                                            <div className="space-y-2">
                                                <h3 className="text-sm font-medium mb-3">Select Preset Option</h3>
                                                {isLoadingPresets ? (
                                                    <div className="space-y-2">
                                                        <Skeleton className="h-14 w-full" />
                                                        <Skeleton className="h-14 w-full" />
                                                        <Skeleton className="h-14 w-full" />
                                                    </div>
                                                ) : !presetsData?.options?.length ? (
                                                    <div className="text-center py-8 bg-ui-bg-subtle rounded-lg">
                                                        <Text className="text-ui-fg-muted">
                                                            No preset options available.
                                                        </Text>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {presetsData.options.map((preset: StatisticsOption) => {
                                                            const isSelected = presetOptionIdWatch === preset.id

                                                            return (
                                                                <button
                                                                    key={preset.id}
                                                                    type="button"
                                                                    onClick={() => form.setValue("preset_option_id", preset.id)}
                                                                    className={`w-full p-3 rounded-lg text-left transition-colors border ${isSelected
                                                                        ? "bg-ui-bg-base border-ui-border-interactive"
                                                                        : "bg-ui-bg-subtle hover:bg-ui-bg-subtle-hover border-ui-border-base"
                                                                        }`}
                                                                >
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div>
                                                                            <Text className="font-medium text-sm">{preset.local_option_name}</Text>
                                                                            <Text className="text-ui-fg-subtle text-xs mt-1">{preset.provider_option_name}</Text>
                                                                        </div>
                                                                        {isSelected && (
                                                                            <Badge color="green" size="small">
                                                                                Selected
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </ProgressTabs.Content>

                                <ProgressTabs.Content value="parameters">
                                    <ParameterInputs form={form} />
                                </ProgressTabs.Content>

                                <ProgressTabs.Content value="condition">
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="comparison_type">Comparison Type *</Label>
                                            <Controller
                                                name="comparison_type"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <Select {...field} onValueChange={field.onChange}>
                                                        <Select.Trigger>
                                                            <Select.Value />
                                                        </Select.Trigger>
                                                        <Select.Content>
                                                            <Select.Item value="absolute">Absolute</Select.Item>
                                                            <Select.Item value="relative">Relative</Select.Item>
                                                        </Select.Content>
                                                    </Select>
                                                )}
                                            />
                                            <Text className="text-ui-fg-subtle text-xs mt-1">
                                                Absolute compares to a fixed value. Relative compares to a previous period.
                                            </Text>
                                        </div>

                                        {form.watch("comparison_type") === "relative" && (
                                            <>
                                                <div>
                                                    <Label htmlFor="lookback_positions">Lookback Positions *</Label>
                                                    <Input
                                                        id="lookback_positions"
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        {...form.register("lookback_positions", { valueAsNumber: true })}
                                                        placeholder="1"
                                                    />
                                                    <Text className="text-ui-fg-subtle text-xs mt-1">
                                                        Number of intervals to look back for comparison (e.g., 1 = previous interval)
                                                    </Text>
                                                </div>

                                                <div>
                                                    <Label htmlFor="change_type">Change Type *</Label>
                                                    <Controller
                                                        name="change_type"
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <Select {...field} onValueChange={field.onChange}>
                                                                <Select.Trigger>
                                                                    <Select.Value />
                                                                </Select.Trigger>
                                                                <Select.Content>
                                                                    <Select.Item value="absolute">Absolute Change</Select.Item>
                                                                    <Select.Item value="percentage">Percentage Change</Select.Item>
                                                                </Select.Content>
                                                            </Select>
                                                        )}
                                                    />
                                                    <Text className="text-ui-fg-subtle text-xs mt-1">
                                                        How to measure the change from the previous period
                                                    </Text>
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <Label htmlFor="operator">Operator *</Label>
                                            <Controller
                                                name="operator"
                                                control={form.control}
                                                render={({ field }) => (
                                                    <Select {...field} onValueChange={field.onChange}>
                                                        <Select.Trigger>
                                                            <Select.Value />
                                                        </Select.Trigger>
                                                        <Select.Content>
                                                            <Select.Item value="gt">Greater Than (&gt;)</Select.Item>
                                                            <Select.Item value="gte">Greater Than or Equal (≥)</Select.Item>
                                                            <Select.Item value="lt">Less Than (&lt;)</Select.Item>
                                                            <Select.Item value="lte">Less Than or Equal (≤)</Select.Item>
                                                            <Select.Item value="eq">Equal To (=)</Select.Item>
                                                            <Select.Item value="neq">Not Equal To (≠)</Select.Item>
                                                            <Select.Item value="between">Between</Select.Item>
                                                        </Select.Content>
                                                    </Select>
                                                )}
                                            />
                                        </div>

                                        {form.watch("operator") === "between" ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label htmlFor="threshold_min">Minimum Threshold *</Label>
                                                    <Input
                                                        id="threshold_min"
                                                        type="number"
                                                        step="0.01"
                                                        value={
                                                            Array.isArray(form.watch("threshold"))
                                                                ? String((form.watch("threshold") as [number, number])[0])
                                                                : "0"
                                                        }
                                                        onChange={(e) => {
                                                            const current = form.watch("threshold")
                                                            const max = Array.isArray(current) ? current[1] : 0
                                                            form.setValue("threshold", [Number(e.target.value), max] as [number, number])
                                                        }}
                                                        placeholder="Min"
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="threshold_max">Maximum Threshold *</Label>
                                                    <Input
                                                        id="threshold_max"
                                                        type="number"
                                                        step="0.01"
                                                        value={
                                                            Array.isArray(form.watch("threshold"))
                                                                ? String((form.watch("threshold") as [number, number])[1])
                                                                : "0"
                                                        }
                                                        onChange={(e) => {
                                                            const current = form.watch("threshold")
                                                            const min = Array.isArray(current) ? current[0] : 0
                                                            form.setValue("threshold", [min, Number(e.target.value)] as [number, number])
                                                        }}
                                                        placeholder="Max"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <Label htmlFor="threshold">Threshold Value *</Label>
                                                <Input
                                                    id="threshold"
                                                    type="number"
                                                    step="0.01"
                                                    value={
                                                        typeof form.watch("threshold") === "number"
                                                            ? String(form.watch("threshold"))
                                                            : "0"
                                                    }
                                                    onChange={(e) => form.setValue("threshold", Number(e.target.value))}
                                                    placeholder="0"
                                                />
                                                {form.formState.errors.threshold && (
                                                    <Text className="text-ui-fg-error text-sm mt-1">
                                                        {form.formState.errors.threshold.message}
                                                    </Text>
                                                )}
                                            </div>
                                        )}

                                        <div>
                                            <Label>Interval *</Label>
                                            <div className="grid grid-cols-2 gap-3 mt-2">
                                                <div>
                                                    <Label htmlFor="interval_value">Value</Label>
                                                    <Input
                                                        id="interval_value"
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={String(intervalValue)}
                                                        onChange={(e) => {
                                                            const nextValue = Number(e.target.value)
                                                            setIntervalValue(Number.isFinite(nextValue) ? Math.max(1, Math.floor(nextValue)) : 1)
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="interval_unit">Unit</Label>
                                                    <Select
                                                        value={intervalUnit}
                                                        onValueChange={(val) => setIntervalUnit(val as IntervalUnit)}
                                                    >
                                                        <Select.Trigger id="interval_unit">
                                                            <Select.Value />
                                                        </Select.Trigger>
                                                        <Select.Content>
                                                            <Select.Item value="seconds">Seconds</Select.Item>
                                                            <Select.Item value="minutes">Minutes</Select.Item>
                                                            <Select.Item value="hours">Hours</Select.Item>
                                                            <Select.Item value="days">Days</Select.Item>
                                                            <Select.Item value="weeks">Weeks</Select.Item>
                                                        </Select.Content>
                                                    </Select>
                                                </div>
                                            </div>
                                            <Text className="text-ui-fg-subtle text-xs mt-2">
                                                Time granularity for data aggregation and comparison ({intervalToSeconds(intervalValue, intervalUnit)}s)
                                            </Text>
                                        </div>
                                    </div>
                                </ProgressTabs.Content>
                            </form>
                        </div>
                    </ProgressTabs>
                </FocusModal.Body>

                <FocusModal.Footer>
                    <div className="flex items-center justify-end gap-2">
                        {currentTab !== "info" && (
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    const currentIndex = tabs.findIndex((t) => t.value === currentTab)
                                    if (currentIndex > 0) {
                                        setCurrentTab(tabs[currentIndex - 1].value)
                                    }
                                }}
                            >
                                Back
                            </Button>
                        )}

                        {currentTab !== "condition" ? (
                            <Button
                                onClick={() => {
                                    const currentIndex = tabs.findIndex((t) => t.value === currentTab)
                                    if (currentIndex < tabs.length - 1) {
                                        setCurrentTab(tabs[currentIndex + 1].value)
                                    }
                                }}
                                disabled={!canProceed(currentTab)}
                            >
                                Next
                            </Button>
                        ) : (
                            <Button
                                onClick={form.handleSubmit(onSubmit)}
                                isLoading={submitMutation.isPending}
                            >
                                {isEditMode ? "Save Changes" : "Create Alert"}
                            </Button>
                        )}
                    </div>
                </FocusModal.Footer>
            </FocusModal.Content>
        </FocusModal>
    )
}
