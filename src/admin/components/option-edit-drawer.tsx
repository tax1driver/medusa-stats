import { useEffect, useMemo, useState } from "react"
import {
    Drawer,
    Button,
    IconButton,
    Badge,
    Text,
    usePrompt,
} from "@medusajs/ui"
import { Trash, Plus } from "@medusajs/icons"
import { OptionEditPanel } from "./option-edit-panel"
import type { StatisticsOption, SeriesVisualizationConfig, InputDependency } from "../lib/statistics/api"

export type OptionEditDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    options: StatisticsOption[]
    title: string
    description?: string
    onSave: (updates: Array<{
        optionId: string
        data: Record<string, any>
        local_option_name?: string
        visualization_config?: SeriesVisualizationConfig | null
        cache_options?: { enabled?: boolean; ttl?: number } | null
        input_dependencies?: InputDependency[]
    }>) => void
    onDelete?: (optionId: string) => void
    onAdd?: () => void
    isSaving?: boolean
    showVisualizationOptions?: boolean
    showCacheOptions?: boolean
    addButtonLabel?: string
    context?: "chart" | "preset"
    loading?: boolean
}

const collectOptions = (roots: StatisticsOption[]): Map<string, StatisticsOption> => {
    const map = new Map<string, StatisticsOption>()

    const addOption = (option?: StatisticsOption | null) => {
        if (!option || map.has(option.id)) {
            return
        }
        map.set(option.id, option)
        option.input_dependencies?.forEach((dep) => {
            if (dep.input_option) {
                addOption(dep.input_option)
            }
        })
    }

    roots.forEach(addOption)
    return map
}

export const OptionEditDrawer = ({
    open,
    onOpenChange,
    options,
    title,
    description,
    onSave,
    onDelete,
    onAdd,
    isSaving = false,
    showVisualizationOptions = true,
    showCacheOptions = true,
    addButtonLabel = "Add Series",
    context = "chart",
    loading = false,
}: OptionEditDrawerProps) => {
    const [activeTab, setActiveTab] = useState<string | null>(null)
    const prompt = usePrompt()
    const [editedData, setEditedData] = useState<Record<string, Record<string, any>>>({})
    const [editedNames, setEditedNames] = useState<Record<string, string>>({})
    const [editedVisualizations, setEditedVisualizations] = useState<Record<string, SeriesVisualizationConfig>>({})
    const [editedCacheOptions, setEditedCacheOptions] = useState<Record<string, { enabled?: boolean; ttl?: number } | null>>({})
    const [editedDependencies, setEditedDependencies] = useState<Record<string, InputDependency[]>>({})

    const rootOptionIds = useMemo(() => options.map((opt) => opt.id), [options])
    const optionMap = useMemo(() => collectOptions(options), [options])

    const orderedOptions = useMemo(() => {
        const visited = new Set<string>()
        const ordered: StatisticsOption[] = []

        const traverse = (option?: StatisticsOption | null) => {
            if (!option || visited.has(option.id)) {
                return
            }
            visited.add(option.id)
            ordered.push(option)
            option.input_dependencies?.forEach((dep) => {
                const child = optionMap.get(dep.input_option_id) || dep.input_option
                traverse(child)
            })
        }

        options.forEach(traverse)
        return ordered
    }, [options, optionMap])

    const topLevelOptions = useMemo(() => {
        if (options.length <= 1) {
            return options
        }

        return options.filter((opt) => {
            const referenced = options.some((parent) =>
                parent.input_dependencies?.some((dep) => dep.input_option_id === opt.id)
            )
            return !referenced
        })
    }, [options])

    useEffect(() => {
        if (!open) {
            setActiveTab(null)
            return
        }

        if (orderedOptions.length === 0) {
            return
        }

        const dataMap: Record<string, Record<string, any>> = {}
        const nameMap: Record<string, string> = {}
        const vizMap: Record<string, SeriesVisualizationConfig> = {}
        const cacheMap: Record<string, { enabled?: boolean; ttl?: number } | null> = {}
        const depsMap: Record<string, InputDependency[]> = {}

        orderedOptions.forEach((opt) => {
            dataMap[opt.id] = opt.data || {}
            nameMap[opt.id] = opt.local_option_name
            vizMap[opt.id] = opt.visualization_config || {}
            cacheMap[opt.id] = opt.cache_options || null
            depsMap[opt.id] = opt.input_dependencies || []
        })

        setEditedData(dataMap)
        setEditedNames(nameMap)
        setEditedVisualizations(vizMap)
        setEditedCacheOptions(cacheMap)
        setEditedDependencies(depsMap)

        setActiveTab((previous) => {
            if (previous && optionMap.has(previous)) {
                return previous
            }
            const defaultRoot = rootOptionIds[0]
            if (defaultRoot) {
                return defaultRoot
            }
            return orderedOptions[0]?.id ?? null
        })
    }, [open, orderedOptions, optionMap, rootOptionIds])

    const handleSaveAll = () => {
        const updates = orderedOptions.map((opt) => {
            const isRoot = rootOptionIds.includes(opt.id)

            return {
                optionId: opt.id,
                data: editedData[opt.id],
                local_option_name: editedNames[opt.id] !== opt.local_option_name ? editedNames[opt.id] : undefined,
                visualization_config: isRoot && showVisualizationOptions ? editedVisualizations[opt.id] : undefined,
                cache_options: isRoot && showCacheOptions ? editedCacheOptions[opt.id] : undefined,
                input_dependencies: editedDependencies[opt.id],
            }
        })

        onSave(updates)
        onOpenChange(false)
    }

    const handleDelete = (optionId: string) => {
        if (!onDelete) {
            return
        }

        onDelete(optionId)
        if (activeTab === optionId) {
            const remaining = options.filter((opt) => opt.id !== optionId)
            const fallback = remaining[0]?.id ?? null
            setActiveTab(fallback)
        }
    }

    const renderOptionItem = (option: StatisticsOption, depth = 0) => {
        const isActive = activeTab === option.id

        const dependencies = editedDependencies[option.id] || option.input_dependencies || []
        const childOptions = dependencies.map((dep) =>
            optionMap.get(dep.input_option_id) || dep.input_option
        ).filter((child): child is StatisticsOption => Boolean(child))

        return (
            <div key={option.id}>
                <div
                    className={`flex items-center gap-1 rounded-md transition-colors ${depth > 0 ? "ml-4 border-l-2 border-ui-border-base pl-2" : ""
                        } ${isActive
                            ? "bg-ui-bg-base border border-ui-border-base shadow-sm"
                            : "hover:bg-ui-bg-base-hover"
                        }`}
                >
                    <button
                        onClick={() => setActiveTab(option.id)}
                        className="flex-1 text-left px-3 py-2 text-sm min-w-24"
                    >
                        <div className="font-medium truncate">{option.local_option_name}</div>
                        <div className="text-ui-fg-subtle text-xs truncate mt-0.5">
                            {option.provider?.display_name || option.provider?.id || option.provider_id}
                        </div>
                        {childOptions.length > 0 && (
                            <Badge size="xsmall" color="blue" className="mt-1">
                                Composite ({childOptions.length})
                            </Badge>
                        )}
                    </button>
                    <div className="flex items-center gap-1 mr-1">
                        {onDelete && depth === 0 && (
                            <IconButton
                                size="small"
                                variant="transparent"
                                onClick={async (e) => {
                                    e.stopPropagation()
                                    const confirmed = await prompt({
                                        title: "Remove option?",
                                        description: `Remove "${option.local_option_name}"?`,
                                        variant: "danger",
                                        confirmText: "Remove",
                                    })

                                    if (!confirmed) {
                                        return
                                    }

                                    handleDelete(option.id)
                                }}
                            >
                                <Trash className="text-ui-fg-subtle hover:text-ui-fg-error" />
                            </IconButton>
                        )}
                    </div>
                </div>

                {childOptions.length > 0 && (
                    <div className="mt-1">
                        {childOptions.map((child) => renderOptionItem(child, depth + 1))}
                    </div>
                )}
            </div>
        )
    }

    const currentOption = activeTab ? optionMap.get(activeTab) : undefined
    const currentIsRoot = currentOption ? rootOptionIds.includes(currentOption.id) : false

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <Drawer.Content className="max-w-3xl">
                <Drawer.Header>
                    <Drawer.Title>{title}</Drawer.Title>
                    {description && (
                        <Drawer.Description className="!txt-compact-small-plus">
                            {description}
                        </Drawer.Description>
                    )}
                </Drawer.Header>
                <Drawer.Body className="overflow-hidden flex flex-col p-0">
                    <div className="flex h-full">
                        <div className="w-56 border-r border-ui-border-base bg-ui-bg-subtle p-2 overflow-y-auto">
                            {topLevelOptions.length > 0 && (
                                <div className="space-y-2 mb-2">
                                    {topLevelOptions.map((opt) => renderOptionItem(opt, 0))}
                                </div>
                            )}
                            {onAdd && (
                                <Button
                                    size="small"
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => {
                                        onOpenChange(false)
                                        onAdd()
                                    }}
                                >
                                    <Plus className="mr-1" />
                                    {addButtonLabel}
                                </Button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-3">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Text className="text-ui-fg-subtle">Loading option...</Text>
                                </div>
                            ) : currentOption ? (
                                <OptionEditPanel
                                    key={currentOption.id}
                                    option={currentOption}
                                    editedData={editedData[currentOption.id] || {}}
                                    editedName={editedNames[currentOption.id] || currentOption.local_option_name}
                                    editedVisualization={editedVisualizations[currentOption.id] || {}}
                                    editedCacheOptions={editedCacheOptions[currentOption.id] || null}
                                    editedDependencies={editedDependencies[currentOption.id] || []}
                                    onDataChange={(data) =>
                                        setEditedData((prev) => ({ ...prev, [currentOption.id]: data }))
                                    }
                                    onNameChange={(name) =>
                                        setEditedNames((prev) => ({ ...prev, [currentOption.id]: name }))
                                    }
                                    onVisualizationChange={
                                        currentIsRoot && showVisualizationOptions
                                            ? (viz) =>
                                                setEditedVisualizations((prev) => ({
                                                    ...prev,
                                                    [currentOption.id]: viz,
                                                }))
                                            : undefined
                                    }
                                    onCacheOptionsChange={
                                        currentIsRoot && showCacheOptions
                                            ? (opts) =>
                                                setEditedCacheOptions((prev) => ({
                                                    ...prev,
                                                    [currentOption.id]: opts,
                                                }))
                                            : undefined
                                    }
                                    onDependenciesChange={
                                        (deps) => {
                                            setEditedDependencies((prev) => ({
                                                ...prev,
                                                [currentOption.id]: deps,
                                            }));

                                            onSave([{
                                                optionId: currentOption.id,
                                                ...currentOption,
                                                input_dependencies: deps,
                                            }])
                                        }
                                    }
                                    showVisualizationOptions={currentIsRoot && showVisualizationOptions}
                                    showCacheOptions={currentIsRoot && showCacheOptions}
                                    showDependenciesSection={true}
                                    context={currentIsRoot ? context : "dependency"}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Text className="text-ui-fg-subtle">
                                        {options.length === 0 ? "No options to edit" : "Select an option to edit"}
                                    </Text>
                                </div>
                            )}
                        </div>
                    </div>
                </Drawer.Body>
                <Drawer.Footer>
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSaveAll} isLoading={isSaving} disabled={loading || isSaving}>
                        Save All Changes
                    </Button>
                </Drawer.Footer>
            </Drawer.Content>
        </Drawer>
    )
}
