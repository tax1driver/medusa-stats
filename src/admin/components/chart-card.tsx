import { useState } from "react"
import {
    Text,
    Heading,
    DropdownMenu,
    IconButton,
    Alert,
    Skeleton,
    toast,
} from "@medusajs/ui"
import {
    EllipsisHorizontal,
    PencilSquare,
    Trash,
    ChartBar,
} from "@medusajs/icons"
import type { InputDependency, StatisticsChart, StatisticsOption } from "../lib/statistics/api"
import { ComboChart } from "./combo-chart"
import { OptionEditDrawer } from "./option-edit-drawer"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { STATISTICS_QUERY } from "../lib/queries"
import { updateOption, removeStatisticFromChart } from "../lib/statistics/api"

type ChartCardProps = {
    chart: StatisticsChart
    viewId: string
    results?: Record<string, any>
    definitions?: Record<string, any>
    isCalculating?: boolean
    interval: number
    onEdit?: () => void
    onDelete?: () => void
    onAddSeries?: () => void
    onEditOption?: (optionId: string) => void
}

export const ChartCard = ({
    chart,
    viewId,
    results,
    definitions,
    isCalculating,
    interval,
    onEdit,
    onDelete,
    onAddSeries,
    onEditOption,
}: ChartCardProps) => {
    const queryClient = useQueryClient()
    const [isEditOpen, setIsEditOpen] = useState(false)


    const statisticsWithResults = (chart.statistics || []).map((stat: StatisticsOption) => ({
        ...stat,
        result: results?.[stat.id],
        definition: definitions?.[stat.provider_id]?.find((v) => v.id === stat.provider_option_name),
    }));



    const allErrors = statisticsWithResults.every((stat) =>
        results?.[stat.id] && 'error' in results[stat.id]
    )


    const warnings: string[] = []
    statisticsWithResults.forEach((stat) => {
        if (stat.result?.metadata?.warnings) {
            warnings.push(...stat.result.metadata.warnings)
        }
    })


    const updateMutation = useMutation({
        mutationFn: async (updates: Array<{
            optionId: string
            data: Record<string, any>
            local_option_name?: string
            visualization_config?: any
            cache_options?: { enabled?: boolean; ttl?: number } | null
            input_dependencies?: InputDependency[]
        }>) => {

            await Promise.all(
                updates.map(update =>
                    updateOption(update.optionId, {
                        data: update.data,
                        local_option_name: update.local_option_name,
                        visualization_config: update.visualization_config,
                        input_dependencies: update.input_dependencies,
                        cache_options: update.cache_options
                    })
                )
            )
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views", viewId] })
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views", viewId, "calculate"] })
            toast.success("Success", {
                description: "All changes saved successfully",
            })
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to save changes",
            })
        }
    })


    const deleteStatisticMutation = useMutation({
        mutationFn: (statisticId: string) => removeStatisticFromChart(chart.id, statisticId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views", viewId] })
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "views", viewId, "calculate"] })
            toast.success("Success", {
                description: "Series removed from chart successfully",
            })
        },
        onError: (error) => {
            toast.error("Error", {
                description: error.message || "Failed to remove series from chart",
            })
        }
    })

    return (
        <>
            <div className="border border-ui-border-base rounded-lg p-4 bg-ui-bg-base">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 h-12">
                        <Heading level="h3" className="text-base font-medium">
                            {chart.name}
                        </Heading>
                        {chart.description && (
                            <Text className="text-ui-fg-subtle text-sm mt-1">
                                {chart.description}
                            </Text>
                        )}
                    </div>
                    <DropdownMenu>
                        <DropdownMenu.Trigger asChild>
                            <IconButton size="small" variant="transparent">
                                <EllipsisHorizontal />
                            </IconButton>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content>
                            <DropdownMenu.Item onClick={() => setIsEditOpen(true)}>
                                <ChartBar className="mr-2" />
                                Edit Series
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onClick={onEdit}>
                                <PencilSquare className="mr-2" />
                                Edit Chart
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item className="text-ui-fg-error" onClick={onDelete}>
                                <Trash className="mr-2" />
                                Delete Chart
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu>
                </div>


                {isCalculating && (
                    <div className="p-4 bg-ui-bg-subtle rounded">
                        <Skeleton className="h-80 w-full" />
                    </div>
                )}

                {allErrors && !isCalculating && statisticsWithResults.length > 0 && (
                    <Alert variant="error" className="mt-3">
                        All statistics failed to calculate
                    </Alert>
                )}

                {!isCalculating && !allErrors && statisticsWithResults.length > 0 && (
                    <div className="mt-4">
                        <ComboChart
                            statistics={statisticsWithResults}
                            chartConfig={chart.visualization_config}
                            interval={interval}
                        />

                        {warnings.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {warnings.map((warning: string, idx: number) => (
                                    <Alert key={idx} variant="warning" dismissible>
                                        {warning}
                                    </Alert>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!isCalculating && statisticsWithResults.length === 0 && (
                    <Alert variant="warning" className="mt-3">
                        This chart has no statistics. Please add a statistic to display data.
                    </Alert>
                )}
            </div>


            <OptionEditDrawer
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                options={chart.statistics || []}
                title="Edit Chart Series"
                description={`Configure parameters and visualization for each series in ${chart.name}`}
                onSave={(updates) => updateMutation.mutate(updates)}
                onDelete={(optionId) => deleteStatisticMutation.mutate(optionId)}
                onAdd={onAddSeries}
                isSaving={updateMutation.isPending}
                showVisualizationOptions={true}
                showCacheOptions={true}
                addButtonLabel="Add Series"
            />
        </>
    )
}
