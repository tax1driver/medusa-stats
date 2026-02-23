import { Drawer, Button, Text, Badge, Input, Label } from "@medusajs/ui"
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { STATISTICS_QUERY } from "../lib/queries"
import { getAllProviderStatistics, StatisticsProvider, type AvailableStatistic } from "../lib/statistics/api"

type OptionSelectorProps = {
    onSelect: (data: {
        provider_id: string
        provider_option_name: string
        local_option_name: string
    }) => void
    title?: string
    description?: string
    excludeStatistics?: Array<{ provider_id: string; provider_option_name: string }>
    enabled?: boolean
}

/**
 * Reusable selector for choosing an available statistic from providers.
 * Can be embedded in another drawer/modal, or wrapped with OptionSelectorDrawer.
 */
export const OptionSelector = ({
    onSelect,
    title,
    description,
    excludeStatistics = [],
    enabled = true,
}: OptionSelectorProps) => {
    const [searchQuery, setSearchQuery] = useState("")

    // Get available statistics from all providers
    const { data: statisticsData, isLoading } = useQuery({
        queryKey: [STATISTICS_QUERY, "providers", "all-statistics"],
        queryFn: () => getAllProviderStatistics(),
        enabled,
    })

    // Filter out excluded statistics and apply search
    const filteredStatistics = useMemo(() => {
        if (!statisticsData?.statistics) return []

        return statisticsData.statistics.filter((stat) => {
            // Check if excluded
            const isExcluded = excludeStatistics.some(
                (excluded) =>
                    excluded.provider_id === stat.provider_id &&
                    excluded.provider_option_name === stat.id
            )
            if (isExcluded) return false

            // Apply search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase()
                return (
                    stat.name.toLowerCase().includes(query) ||
                    stat.description?.toLowerCase().includes(query) ||
                    stat.provider_name.toLowerCase().includes(query)
                )
            }

            return true
        })
    }, [statisticsData, excludeStatistics, searchQuery])

    // Group statistics by provider
    const groupedStatistics = useMemo(() => {
        return filteredStatistics.reduce((acc, stat) => {
            if (!acc[stat.provider_id]) {
                acc[stat.provider_id] = []
            }
            acc[stat.provider_id].push(stat)
            return acc
        }, {} as Record<string, (AvailableStatistic & { provider_id: string; provider: StatisticsProvider })[]>)
    }, [filteredStatistics])

    const handleSelect = (stat: AvailableStatistic & { provider_id: string; provider: StatisticsProvider }) => {
        onSelect({
            provider_id: stat.provider_id,
            provider_option_name: stat.id,
            local_option_name: stat.name,
        })
    }

    return (
        <div className="flex h-full flex-col gap-y-4">
            {(title || description) && (
                <div className="flex flex-col gap-y-1">
                    {title && (
                        <Text size="small" weight="plus">
                            {title}
                        </Text>
                    )}
                    {description && (
                        <Text size="small" className="text-ui-fg-subtle">
                            {description}
                        </Text>
                    )}
                </div>
            )}

            <div className="flex flex-col gap-y-2">
                <Label htmlFor="option-selector-search">Search</Label>
                <Input
                    id="option-selector-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by statistic or provider"
                />
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <Text className="text-ui-fg-muted">Loading statistics...</Text>
                </div>
            ) : !statisticsData || filteredStatistics.length === 0 ? (
                <div className="text-center py-12 bg-ui-bg-subtle rounded-lg">
                    <Text className="text-ui-fg-muted">
                        {searchQuery
                            ? "No statistics match your search"
                            : "No statistics providers available. Enable providers first."}
                    </Text>
                </div>
            ) : (
                <div className="space-y-4 overflow-y-auto">
                    {Object.entries(groupedStatistics).map(([providerId, stats]) => (
                        <div
                            key={providerId}
                            className="border border-ui-border-base bg-ui-bg-subtle rounded-lg p-4"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <Badge>{stats[0]?.provider.display_name || providerId}</Badge>
                                <Text className="text-ui-fg-muted text-xs">
                                    {stats.length} available
                                </Text>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {stats.map((stat) => (
                                    <button
                                        key={stat.id}
                                        type="button"
                                        onClick={() => handleSelect(stat)}
                                        className="p-3 rounded-lg text-left transition-colors bg-ui-bg-base hover:bg-ui-bg-base-hover"
                                    >
                                        <div className="flex-1">
                                            <Text className="font-medium text-sm">{stat.name}</Text>
                                            {stat.description && (
                                                <Text className="text-ui-fg-subtle text-xs mt-1">
                                                    {stat.description}
                                                </Text>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

type OptionSelectorDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelect: (data: {
        provider_id: string
        provider_option_name: string
        local_option_name: string
    }) => void
    title?: string
    description?: string
    excludeStatistics?: Array<{ provider_id: string; provider_option_name: string }>
}

export const OptionSelectorDrawer = ({
    open,
    onOpenChange,
    onSelect,
    title = "Select Statistic",
    description = "Choose a statistic to add",
    excludeStatistics,
}: OptionSelectorDrawerProps) => {
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <Drawer.Content>
                <Drawer.Header>
                    <Drawer.Title>{title}</Drawer.Title>
                    <Drawer.Description className="!txt-compact-small-plus">{description}</Drawer.Description>
                </Drawer.Header>

                <Drawer.Body className="overflow-hidden">
                    <OptionSelector
                        onSelect={onSelect}
                        excludeStatistics={excludeStatistics}
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
