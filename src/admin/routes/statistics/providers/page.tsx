import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
    Container,
    Badge,
    Table,
    StatusBadge,
    Heading,
} from "@medusajs/ui"
import { Adjustments as AdjustmentsHorizontal, ChevronDownMini, ChevronUpMini } from "@medusajs/icons"
import { useQuery } from "@tanstack/react-query"
import { STATISTICS_QUERY } from "../../../lib/queries"
import { listProviders, getProviderStatistics, type StatisticsProvider, AvailableStatistic } from "../../../lib/statistics/api"
import { useState } from "react"
import { Skeleton } from "../../../components/skeleton"

interface ProviderRowProps {
    provider: StatisticsProvider & { statistics?: AvailableStatistic[] };
    isExpanded: boolean
    onToggle: () => void
}

const ProviderRow = ({ provider, isExpanded, onToggle }: ProviderRowProps) => {
    const statistics = provider?.statistics || []

    return (
        <>
            <Table.Row
                className="cursor-pointer"
                onClick={onToggle}
            >
                <Table.Cell>
                    <div className="flex items-center gap-3 py-2">
                        <div className="bg-ui-bg-subtle border rounded-lg p-2">
                            <AdjustmentsHorizontal className="text-ui-fg-muted" />
                        </div>
                        <div>
                            <p className="font-medium">{provider.display_name || provider.id}</p>
                            <p className="text-ui-fg-muted text-xs">
                                {provider.id}
                            </p>
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
                    <Table.Cell {...{ colSpan: 4 }}>
                        <div className="space-y-2 py-4">
                            <h4 className="text-sm font-medium mb-3">Available Statistics</h4>
                            <div className="grid gap-2">
                                {statistics.map((stat: AvailableStatistic) => (
                                    <div
                                        key={stat.id}
                                        className="bg-ui-bg-base rounded-lg p-3 border border-ui-border-base"
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
}

const LoadingRow = () => (
    <Table.Row>
        <Table.Cell>
            <div>
                <Skeleton className="h-5 w-48 mb-1" />
                <Skeleton className="h-4 w-32" />
            </div>
        </Table.Cell>
        <Table.Cell>
            <Skeleton className="h-5 w-24" />
        </Table.Cell>
        <Table.Cell>
            <Skeleton className="h-5 w-20" />
        </Table.Cell>
        <Table.Cell>
            <Skeleton className="h-5 w-24" />
        </Table.Cell>
    </Table.Row>
)

const ProvidersPage = () => {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

    const { data, isLoading } = useQuery({
        queryFn: () => listProviders(),
        queryKey: [STATISTICS_QUERY, "providers"],
    })

    const providers = data?.providers || []

    const toggleRow = (providerId: string) => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(providerId)) {
                newSet.delete(providerId)
            } else {
                newSet.add(providerId)
            }
            return newSet
        })
    }

    return (
        <Container className="divide-y p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
                <Heading level="h2">Providers</Heading>
            </div>
            <div className="overflow-x-auto">
                <Table>
                    <Table.Header className="!border-none">
                        <Table.Row>
                            <Table.HeaderCell>Provider</Table.HeaderCell>
                            <Table.HeaderCell>Statistics</Table.HeaderCell>
                            <Table.HeaderCell>Status</Table.HeaderCell>
                            <Table.HeaderCell></Table.HeaderCell>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body className="!border-none">
                        {isLoading ? (
                            <>
                                <LoadingRow />
                                <LoadingRow />
                                <LoadingRow />
                            </>
                        ) : providers.length > 0 ? (
                            providers.map((provider) => (
                                <ProviderRow
                                    key={provider.id}
                                    provider={provider}
                                    isExpanded={expandedRows.has(provider.id)}
                                    onToggle={() => toggleRow(provider.id)}
                                />
                            ))
                        ) : (
                            <Table.Row>
                                <Table.Cell {...{ colSpan: 4 }} className="text-center text-ui-fg-muted ">
                                    No providers found
                                </Table.Cell>
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table>
            </div>
        </Container>
    )
}

export const config = defineRouteConfig({
    label: "Providers",
})

export default ProvidersPage
