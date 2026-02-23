import { Button, Text, Badge, toast } from "@medusajs/ui"
import { Plus, XMarkMini } from "@medusajs/icons"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { STATISTICS_QUERY } from "../lib/queries"
import { createOption, type InputDependency } from "../lib/statistics/api"
import { OptionSelectorDrawer } from "./option-selector-modal"

type DependencyInputEditorProps = {
    dependencies: InputDependency[]
    onChange: (dependencies: InputDependency[]) => void
    excludeOptionId?: string
    viewId: string
}

export const DependencyInputEditor = ({
    dependencies,
    onChange,
    excludeOptionId,
    viewId,
}: DependencyInputEditorProps) => {
    const queryClient = useQueryClient()
    const [selectorOpen, setSelectorOpen] = useState(false)


    const createOptionMutation = useMutation({
        mutationFn: async (data: {
            provider_id: string
            provider_option_name: string
            local_option_name: string
        }) => {
            return await createOption({
                view_id: viewId,
                ...data,
            })
        },
        onSuccess: (createdOption) => {
            queryClient.invalidateQueries({ queryKey: [STATISTICS_QUERY, "options"] })


            const newDependency: InputDependency = {
                id: `temp-${Date.now()}`,
                composite_option_id: excludeOptionId || "",
                input_option_id: createdOption.id,
                parameter_name: null,
                order: dependencies.length,
                metadata: null,
                input_option: createdOption,
            }

            onChange([...dependencies, newDependency])
            setSelectorOpen(false)
            toast.success("Dependency added")
        },
        onError: (error: unknown) => {
            const message = error instanceof Error ? error.message : "Failed to create dependency"
            toast.error(message)
        },
    })

    const handleStatisticSelected = (data: {
        provider_id: string
        provider_option_name: string
        local_option_name: string
    }) => {
        createOptionMutation.mutate(data)
    }

    const handleRemove = (depId: string) => {
        onChange(dependencies.filter((dep) => dep.id !== depId))
        toast.success("Dependency removed")
    }

    return (
        <div className="flex flex-col gap-y-3">
            <div className="flex items-center justify-between">
                <Text size="small" weight="plus">
                    Input Dependencies
                </Text>
                <Button
                    size="small"
                    variant="secondary"
                    onClick={() => setSelectorOpen(true)}
                >
                    <Plus />
                    Add Input
                </Button>
            </div>

            {dependencies.length === 0 ? (
                <div className="border border-dashed border-ui-border-base rounded-lg p-6 text-center">
                    <Text size="small" className="text-ui-fg-subtle">
                        No dependencies configured. Add inputs to create a composite statistic.
                    </Text>
                </div>
            ) : (
                <div className="flex flex-col gap-y-2">
                    {dependencies.map((dep) => (
                        <div
                            key={dep.id}
                            className="flex items-center justify-between border border-ui-border-base rounded-lg p-3"
                        >
                            <div className="flex flex-col gap-y-1 flex-1">
                                <Text size="small" weight="plus">
                                    {dep.input_option?.local_option_name || dep.input_option_id}
                                </Text>
                                <div className="flex items-center gap-2">
                                    <Text size="xsmall" className="text-ui-fg-subtle">
                                        {dep.input_option?.provider_option_name}
                                    </Text>
                                    {dep.parameter_name ? (
                                        <Badge size="xsmall" color="blue">
                                            → {dep.parameter_name}
                                        </Badge>
                                    ) : (
                                        <Badge size="xsmall" color="grey">
                                            Not mapped
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <Button
                                size="small"
                                variant="transparent"
                                onClick={() => handleRemove(dep.id)}
                            >
                                <XMarkMini />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <OptionSelectorDrawer
                open={selectorOpen}
                onOpenChange={setSelectorOpen}
                onSelect={handleStatisticSelected}
                title="Select Input Statistic"
                description="Choose a statistic to use as input for this composite statistic"
                excludeStatistics={dependencies
                    .filter((dep) => dep.input_option?.provider_id && dep.input_option?.provider_option_name)
                    .map((dep) => ({
                        provider_id: dep.input_option!.provider_id,
                        provider_option_name: dep.input_option!.provider_option_name,
                    }))}
            />
        </div>
    )
}
