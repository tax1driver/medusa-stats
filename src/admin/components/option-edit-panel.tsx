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
import { getProviderStatistics } from "../lib/statistics/api"
import type { StatisticsOption, AvailableStatistic, ParameterFieldDefinition, SeriesVisualizationConfig, InputDependency } from "../lib/statistics/api"
import { DependencyInputEditor } from "./dependency-input-editor"
import { useEffect, useMemo, useState } from "react"

const chartStyles = {
    defaultColor: "#3b82f6"
}

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
    field: ParameterFieldDefinition
    value: any
    onChange: (value: any) => void
    inputDependencies?: InputDependency[]
}) => {
    return (
        <div>
            <Label htmlFor={field.name}>{field.label}</Label>
            {field.description && (
                <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
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
                            : field.placeholder || `Select ${field.label}`
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


const ParameterInput = ({
    field,
    value,
    onChange,
}: {
    field: ParameterFieldDefinition
    value: any
    onChange: (value: any) => void
}) => {
    if (field.fieldType === "boolean") {
        return (
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    {field.description && (
                        <Text className="text-ui-fg-subtle text-xs mt-0.5">{field.description}</Text>
                    )}
                </div>
                <Switch
                    id={field.name}
                    checked={value === true}
                    onCheckedChange={onChange}
                />
            </div>
        )
    }

    if (field.fieldType === "select") {
        return (
            <div>
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.description && (
                    <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
                )}
                <Select value={value ?? ""} onValueChange={onChange}>
                    <Select.Trigger id={field.name}>
                        <Select.Value placeholder={field.placeholder || `Select ${field.label}`} />
                    </Select.Trigger>
                    <Select.Content>
                        {field.options?.map((option) => (
                            <Select.Item key={String(option.value)} value={String(option.value)}>
                                {option.label}
                            </Select.Item>
                        ))}
                    </Select.Content>
                </Select>
            </div>
        )
    }

    if (field.fieldType === "number") {
        return (
            <div>
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.description && (
                    <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
                )}
                <Input
                    id={field.name}
                    type="number"
                    placeholder={field.placeholder}
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                />
            </div>
        )
    }


    return (
        <div>
            <Label htmlFor={field.name}>{field.label}</Label>
            {field.description && (
                <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
            )}
            <Input
                id={field.name}
                type="text"
                placeholder={field.placeholder}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value || null)}
            />
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

/**
 * Option Edit Panel - Reusable form component for editing statistic options
 * 
 * This component displays the form fields for editing an option's:
 * - Display name
 * - Parameters
 * - Visualization options (optional, controlled by showVisualizationOptions)
 * - Cache options (optional, controlled by showCacheOptions)
 * 
 * The parent context (Chart, Preset, etc.) should handle the sidebar and overall layout.
 */
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


    const { data: providerStats, isLoading: isLoadingFields } = useQuery({
        queryKey: [STATISTICS_QUERY, "providers", option.provider_id || option.provider?.id, "statistics"],
        queryFn: () => getProviderStatistics(option.provider_id || option.provider!.id),
    })

    const statisticDef = providerStats?.statistics.find(
        (stat: AvailableStatistic) => stat.id === option.provider_option_name
    )

    const hasStatParameters = useMemo(() => {
        return statisticDef?.parameters.fields.some((field: ParameterFieldDefinition) => field.fieldType === "stat")
    }, [statisticDef]);

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
                        {statisticDef.parameters.fields.length === 0 ? (
                            <div className="text-center py-8">
                                <Text className="text-ui-fg-muted">
                                    This statistic has no configurable parameters
                                </Text>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {statisticDef.parameters.fields.map((field: ParameterFieldDefinition) => {

                                    if (field.fieldType === "stat") {

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
                                onValueChange={(val) => onVisualizationChange({ ...editedVisualization, chartType: val === "default" ? undefined : val as any })}
                            >
                                <Select.Trigger id="series_chart_type">
                                    <Select.Value placeholder="Use default" />
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="default">Use default</Select.Item>
                                    <Select.Item value="line">Line</Select.Item>
                                    <Select.Item value="bar">Bar</Select.Item>
                                    <Select.Item value="area">Area</Select.Item>
                                </Select.Content>
                            </Select>
                        </div>

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
