import {
    Text,
    Heading,
    Label,
    Input,
    Select,
    Switch,
} from "@medusajs/ui"
import { Plus } from "@medusajs/icons"
import { HexColorPicker } from "react-colorful"
import { useQuery } from "@tanstack/react-query"
import { STATISTICS_QUERY } from "../lib/queries"
import { getProviderStatistics, getChartTypes } from "../lib/statistics/api"
import type { StatisticsOption, AvailableStatistic, SeriesVisualizationConfig, InputDependency } from "../lib/statistics/api"
// import { LayoutComposer } from "@medusajs/dashboard/components"
import { ChartConfigProvider } from "../lib/chart-config-context"

interface ParameterField { name: string; type: string; metadata: Record<string, any> }
import { DependencyInputEditor } from "./dependency-input-editor"
import { ParameterInput } from "./parameter-input"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

const chartStyles = {
    defaultColor: "#3b82f6"
}

const BUILT_IN_CHART_TYPES = ["2d", "aggregate", "list"];

const PRESET_SERIES_COLORS = [
    "hsl(210, 85%, 60%)",
    "hsl(165, 70%, 60%)",
    "hsl(130, 65%, 60%)",
    "hsl(45, 95%, 60%)",
    "hsl(15, 90%, 60%)",
    "hsl(350, 78%, 60%)",
    "hsl(280, 70%, 60%)",
    "hsl(240, 70%, 60%)",
]


const StatParameterInput = ({
    field,
    value,
    onChange,
    inputDependencies = [],
}: {
    field: ParameterField
    value: any
    onChange: (value: any) => void
    inputDependencies?: InputDependency[]
}) => {
    return (
        <div>
            <Label htmlFor={field.name}>{field.metadata.label || field.name}</Label>
            {field.metadata.description && (
                <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.metadata.description}</Text>
            )}
            <Select
                value={value ?? ""}
                onValueChange={onChange}
                disabled={inputDependencies.length === 0}
            >
                <Select.Trigger id={field.name}>
                    <Select.Value placeholder={
                        inputDependencies.length === 0
                            ? "No dependencies available"
                            : field.metadata.placeholder || `Select ${field.metadata.label || field.name}`
                    } />
                </Select.Trigger>
                <Select.Content>
                    {inputDependencies.map((dep) => (
                        <Select.Item key={dep.id} value={dep.input_option_id}>
                            {dep.input_option?.local_option_name || dep.input_option_id}
                        </Select.Item>
                    ))}
                </Select.Content>
            </Select>
            {inputDependencies.length === 0 && (
                <Text className="text-ui-fg-subtle text-xs mt-1">
                    Add dependencies in the Input Dependencies section to enable this field
                </Text>
            )}
        </div>
    )
}


export type OptionEditPanelProps = {
    option: StatisticsOption
    editedData: Record<string, any>
    editedName: string
    editedVisualization?: SeriesVisualizationConfig
    editedCacheOptions?: { enabled?: boolean; ttl?: number } | null
    editedDependencies?: InputDependency[]
    onDataChange: (data: Record<string, any>) => void
    onNameChange: (name: string) => void
    onVisualizationChange?: (viz: SeriesVisualizationConfig) => void
    onCacheOptionsChange?: (opts: { enabled?: boolean; ttl?: number } | null) => void
    onDependenciesChange?: (deps: InputDependency[]) => void
    showVisualizationOptions?: boolean
    showCacheOptions?: boolean
    showDependenciesSection?: boolean
    context?: "chart" | "preset" | "dependency"
}

export const OptionEditPanel = ({
    option,
    editedData,
    editedName,
    editedVisualization = {},
    editedCacheOptions = null,
    editedDependencies = [],
    onDataChange,
    onNameChange,
    onVisualizationChange,
    onCacheOptionsChange,
    onDependenciesChange,
    showVisualizationOptions = true,
    showCacheOptions = true,
    showDependenciesSection = false,
    context = "chart",
}: OptionEditPanelProps) => {
    const [showCustomColorPicker, setShowCustomColorPicker] = useState(false)
    const { t } = useTranslation("stats")

    const { data: chartTypes } = useQuery({
        queryKey: [STATISTICS_QUERY, "chart-types"],
        queryFn: getChartTypes,
        staleTime: 5 * 60 * 1000,
    })

    const { data: providerStats, isLoading: isLoadingFields } = useQuery({
        queryKey: [STATISTICS_QUERY, "providers", option.provider_id || option.provider?.id, "statistics"],
        queryFn: () => getProviderStatistics(option.provider_id || option.provider!.id),
    })

    const statisticDef = providerStats?.statistics.find(
        (stat: AvailableStatistic) => stat.id === option.provider_option_name
    )

    const hasStatParameters = useMemo(() => {
        return statisticDef?.parameters.some((field: ParameterField) => field.type === "stat")
    }, [statisticDef]);

    const availableChartTypes = chartTypes || BUILT_IN_CHART_TYPES

    const handleChartTypeChange = useCallback(
        (val: string) => {
            onVisualizationChange?.({
                ...editedVisualization,
                chartType: val || undefined,
            })
        },
        [editedVisualization, onVisualizationChange],
    )

    const currentColor = editedVisualization.color || chartStyles.defaultColor
    const isPresetColor = PRESET_SERIES_COLORS.some((color) => color.toLowerCase() === currentColor.toLowerCase())

    useEffect(() => {
        if (!isPresetColor) {
            setShowCustomColorPicker(true)
        }
    }, [isPresetColor, currentColor])

    return (
        <div className="space-y-6">

            {context === "dependency" && (
                <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-3">
                    <Text size="xsmall" className="text-ui-fg-subtle">
                        Editing dependency option. Changes will affect the parent composite statistic.
                    </Text>
                </div>
            )}


            <div>
                <Label htmlFor="option_name">Display Name</Label>
                <Input
                    id="option_name"
                    type="text"
                    placeholder="Enter a custom name"
                    value={editedName}
                    onChange={(e) => onNameChange(e.target.value)}
                />
                <Text className="text-ui-fg-subtle text-xs mt-1">
                    {context === "chart"
                        ? "Customize how this series is displayed in the chart legend"
                        : "Customize the display name for this option"
                    }
                </Text>
            </div>


            <div className="border-t border-ui-border-base pt-6">
                <div className="mb-4">
                    <Heading level="h3" className="text-sm">Parameters</Heading>
                    <Text className="text-ui-fg-subtle text-xs mt-1">
                        Configure data parameters for this {context === "chart" ? "series" : "option"}
                    </Text>
                </div>

                {isLoadingFields && (
                    <div className="text-center py-8">
                        <Text className="text-ui-fg-muted">Loading parameter definitions...</Text>
                    </div>
                )}

                {!isLoadingFields && !statisticDef && (
                    <div className="text-center py-8">
                        <Text className="text-ui-fg-error">
                            Could not load parameter definitions
                        </Text>
                    </div>
                )}

                {!isLoadingFields && statisticDef && (
                    <>
                        {statisticDef.parameters.length === 0 ? (
                            <div className="text-center py-8">
                                <Text className="text-ui-fg-muted">
                                    This statistic has no configurable parameters
                                </Text>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {statisticDef.parameters.map((field: ParameterField) => {

                                    if (field.type === "stat") {

                                        const mappedDep = editedDependencies.find(dep => dep.parameter_name === field.name)
                                        const currentValue = mappedDep?.input_option_id || ""

                                        return (
                                            <StatParameterInput
                                                key={field.name}
                                                field={field}
                                                value={currentValue}
                                                onChange={(selectedOptionId) => {

                                                    if (onDependenciesChange) {
                                                        const updatedDependencies = editedDependencies.map(dep => {

                                                            if (dep.parameter_name === field.name) {
                                                                return { ...dep, parameter_name: null }
                                                            }

                                                            if (dep.input_option_id === selectedOptionId) {
                                                                return { ...dep, parameter_name: field.name }
                                                            }
                                                            return dep
                                                        })
                                                        onDependenciesChange(updatedDependencies)
                                                    }
                                                }}
                                                inputDependencies={editedDependencies}
                                            />
                                        )
                                    }


                                    return (
                                        <ParameterInput
                                            key={field.name}
                                            field={field}
                                            value={editedData[field.name]}
                                            onChange={(newValue) => {
                                                onDataChange({
                                                    ...editedData,
                                                    [field.name]: newValue
                                                })
                                            }}
                                            statContext={{ provider_id: option.provider?.id || option.provider_id, stat_id: option.provider_option_name }}
                                        />
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>


            {showDependenciesSection && onDependenciesChange && hasStatParameters && (
                <div className="border-t border-ui-border-base pt-6">
                    <div className="mb-4">
                        <Heading level="h3" className="text-sm">Input Dependencies</Heading>
                        <Text className="text-ui-fg-subtle text-xs mt-1">
                            Define dependencies that can be injected into parameters
                        </Text>
                    </div>

                    <DependencyInputEditor
                        dependencies={editedDependencies}
                        onChange={onDependenciesChange}
                        excludeOptionId={option.id}
                        viewId={option.view_id}
                    />
                </div>
            )}


            {showVisualizationOptions && onVisualizationChange && (
                <div className="border-t border-ui-border-base pt-6">
                    <div className="mb-4">
                        <Heading level="h3" className="text-sm">Series Visualization</Heading>
                        <Text className="text-ui-fg-subtle text-xs mt-1">
                            Customize how this series appears in the chart
                        </Text>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="series_color">Color</Label>
                            <div className="mt-2 space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    {PRESET_SERIES_COLORS.map((color) => {
                                        const isSelected = !showCustomColorPicker && currentColor.toLowerCase() === color.toLowerCase()

                                        return (
                                            <button
                                                key={color}
                                                type="button"
                                                aria-label={`Use color ${color}`}
                                                onClick={() => {
                                                    setShowCustomColorPicker(false)
                                                    onVisualizationChange({ ...editedVisualization, color })
                                                }}
                                                className={`h-10 rounded border transition-colors ${isSelected
                                                    ? "border-ui-border-interactive"
                                                    : "border-ui-border-base"
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        )
                                    })}

                                    <button
                                        type="button"
                                        onClick={() => setShowCustomColorPicker(true)}
                                        className={`h-10 rounded border flex items-center justify-center transition-colors ${showCustomColorPicker || !isPresetColor
                                            ? "border-ui-border-interactive bg-ui-bg-base"
                                            : "border-ui-border-base bg-ui-bg-subtle"
                                            }`}
                                    >
                                        <Plus className="text-ui-fg-subtle" />
                                    </button>
                                </div>

                                {showCustomColorPicker && (
                                    <div className="space-y-3">
                                        <HexColorPicker
                                            color={currentColor}
                                            onChange={(color) => onVisualizationChange({ ...editedVisualization, color })}
                                            style={{ width: "100%", height: "160px" }}
                                        />
                                        <div className="flex items-center gap-2 [&:first-child]:flex-1">
                                            <Input
                                                id="series_color"
                                                type="text"
                                                value={currentColor}
                                                onChange={(e) => onVisualizationChange({ ...editedVisualization, color: e.target.value })}
                                                placeholder="#3b82f6"
                                                className="font-mono"
                                            />
                                            <div
                                                className="size-8 rounded border border-ui-border-base flex-shrink-0"
                                                style={{ backgroundColor: currentColor }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {!showCustomColorPicker && (
                                    <div className="flex items-center gap-2 [&:first-child]:flex-1">
                                        <Input
                                            id="series_color"
                                            type="text"
                                            value={currentColor}
                                            readOnly
                                            className="font-mono"
                                        />
                                        <div
                                            className="size-8 rounded border border-ui-border-base flex-shrink-0"
                                            style={{ backgroundColor: currentColor }}
                                        />
                                    </div>
                                )}
                                <div>
                                    <Text className="text-ui-fg-subtle text-xs">
                                        Pick a preset color or choose Custom for full color picker
                                    </Text>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="series_chart_type">Chart Type</Label>
                            <Select
                                value={editedVisualization.chartType || ""}
                                onValueChange={handleChartTypeChange}
                            >
                                <Select.Trigger id="series_chart_type">
                                    <Select.Value placeholder="Use default" />
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="_default_">Use default</Select.Item>
                                    {availableChartTypes.map((type) => (
                                        <Select.Item key={type} value={type}>
                                            {t(`chart_types.${type}`, type)}
                                        </Select.Item>
                                    ))}
                                </Select.Content>
                            </Select>
                        </div>
                        {(editedVisualization.chartType === "2d" || !editedVisualization.chartType) && (
                            <div>
                                <Label htmlFor="series_series_type">Series Style</Label>
                                <Select
                                    value={editedVisualization.seriesType || ""}
                                    onValueChange={(val) => onVisualizationChange({ ...editedVisualization, seriesType: val === "_default_" ? undefined : val as any })}
                                >
                                    <Select.Trigger id="series_series_type">
                                        <Select.Value placeholder="Line (default)" />
                                    </Select.Trigger>
                                    <Select.Content>
                                        <Select.Item value="default">Line (default)</Select.Item>
                                        <Select.Item value="line">Line</Select.Item>
                                        <Select.Item value="bar">Bar</Select.Item>
                                        <Select.Item value="area">Area</Select.Item>
                                    </Select.Content>
                                </Select>
                            </div>
                        )}
                        {editedVisualization.chartType &&
                            !BUILT_IN_CHART_TYPES.includes(editedVisualization.chartType) && (
                                <ChartConfigProvider
                                    config={editedVisualization}
                                    onChange={(patch) =>
                                        onVisualizationChange({
                                            ...editedVisualization,
                                            ...patch,
                                        })
                                    }
                                >
                                    <></>
                                    {/* TODO: figure out why LayoutComposer crashes because of useExtension's provider not being present apparently (?) */}
                                    {/* <LayoutComposer
                                        widgetsZonePrefix={`statistics.chart-config.${editedVisualization.chartType}`}
                                        preferredLayoutId="core:single-column"
                                        data={{}}
                                        sections={{ main: <></> }}
                                    /> */}
                                </ChartConfigProvider>
                            )}

                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="series_visible">Visible</Label>
                                <Text className="text-ui-fg-subtle text-xs mt-0.5">
                                    Show or hide this series in the chart
                                </Text>
                            </div>
                            <Switch
                                id="series_visible"
                                checked={editedVisualization.visible !== false}
                                onCheckedChange={(checked) => onVisualizationChange({ ...editedVisualization, visible: checked })}
                            />
                        </div>

                        {(editedVisualization.chartType === "list" || editedVisualization.chartType === "aggregate") && (
                            <>
                                {editedVisualization.chartType === "list" && (
                                    <>
                                        <div>
                                            <Label htmlFor="list_page_size">Rows per page</Label>
                                            <Select
                                                value={String(editedVisualization.pageSize || 10)}
                                                onValueChange={(val) => onVisualizationChange({ ...editedVisualization, pageSize: Number(val) })}
                                            >
                                                <Select.Trigger id="list_page_size">
                                                    <Select.Value />
                                                </Select.Trigger>
                                                <Select.Content>
                                                    {[5, 10, 20, 50, 100].map((n) => (
                                                        <Select.Item key={n} value={String(n)}>
                                                            {n}
                                                        </Select.Item>
                                                    ))}
                                                </Select.Content>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label htmlFor="list_aggregate">Aggregate function</Label>
                                            <Select
                                                value={editedVisualization.aggregate || "_default_"}
                                                onValueChange={(val) => onVisualizationChange({ ...editedVisualization, aggregate: val === "_default_" ? undefined : val })}
                                            >
                                                <Select.Trigger id="list_aggregate">
                                                    <Select.Value placeholder="None" />
                                                </Select.Trigger>
                                                <Select.Content>
                                                    <Select.Item value="_default_">None</Select.Item>
                                                    <Select.Item value="sum">Sum</Select.Item>
                                                    <Select.Item value="avg">Average</Select.Item>
                                                    <Select.Item value="min">Min</Select.Item>
                                                    <Select.Item value="max">Max</Select.Item>
                                                    <Select.Item value="count">Count</Select.Item>
                                                </Select.Content>
                                            </Select>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}


            {showCacheOptions && onCacheOptionsChange && (
                <div className="border-t border-ui-border-base pt-6">
                    <div className="mb-4">
                        <Heading level="h3" className="text-sm">Cache Options</Heading>
                        <Text className="text-ui-fg-subtle text-xs mt-1">
                            Override view-level cache settings for this {context === "chart" ? "series" : "option"}
                        </Text>
                    </div>

                    <div className="space-y-4">

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Override Cache Settings</Label>
                                <Text className="text-ui-fg-subtle text-xs mt-0.5">
                                    Use custom cache settings instead of view defaults
                                </Text>
                            </div>
                            <Switch
                                checked={editedCacheOptions !== null}
                                onCheckedChange={(checked) => {
                                    if (checked) {

                                        onCacheOptionsChange({ enabled: true, ttl: 3600 })
                                    } else {

                                        onCacheOptionsChange(null)
                                    }
                                }}
                            />
                        </div>


                        {editedCacheOptions !== null && (
                            <>
                                <div className="flex items-center justify-between pl-4 border-l-2 border-ui-border-base">
                                    <div>
                                        <Label>Enable Caching</Label>
                                        <Text className="text-ui-fg-subtle text-xs mt-0.5">
                                            Cache results to improve performance
                                        </Text>
                                    </div>
                                    <Switch
                                        checked={editedCacheOptions?.enabled ?? false}
                                        onCheckedChange={(checked) => {
                                            onCacheOptionsChange({
                                                enabled: checked,
                                                ttl: editedCacheOptions?.ttl || 3600
                                            })
                                        }}
                                    />
                                </div>

                                {editedCacheOptions?.enabled && (
                                    <div className="pl-4 border-l-2 border-ui-border-base">
                                        <Label htmlFor="cache-ttl">Cache TTL (seconds)</Label>
                                        <Input
                                            id="cache-ttl"
                                            type="number"
                                            min="60"
                                            value={editedCacheOptions.ttl || 3600}
                                            onChange={(e) => onCacheOptionsChange({
                                                enabled: true,
                                                ttl: Number(e.target.value) || 3600
                                            })}
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
            )}
        </div>
    )
}

