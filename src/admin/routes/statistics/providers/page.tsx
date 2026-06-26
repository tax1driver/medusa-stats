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
import { useTranslation } from "react-i18next"
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
    const { t } = useTranslation("stats")
    const statistics = provider?.statistics || []
    const providerName = t(`${provider.id}.name`, provider.display_name || provider.id)

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
                            <p className="font-medium">{providerName}</p>
                        </div>
                    </div>
                </Table.Cell>
                <Table.Cell>
                    <span className="text-xs text-ui-fg-subtle">
                        {t("providers.statistics_count", { count: statistics.length })}
                    </span>
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
                            <h4 className="text-sm font-medium mb-3">
                                {t("providers.available_statistics", "Available Data Sources")}
                            </h4>
                            <div className="grid gap-2">
                                {statistics.map((stat: AvailableStatistic) => {
                                    const statName = t(`${provider.id}.${stat.id}.name`, stat.id)
                                    const statDesc = t(`${provider.id}.${stat.id}.description`, "")
                                    return (
                                        <div
                                            key={stat.id}
                                            className="bg-ui-bg-base rounded-lg p-3 border border-ui-border-base"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">
                                                        {statName}
                                                    </p>
                                                    {statDesc && (
                                                        <p className="text-xs text-ui-fg-subtle mt-2">
                                                            {statDesc}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
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
    const { t } = useTranslation("stats")
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

    const { data, isLoading } = useQuery({
        queryFn: () => listProviders({ is_enabled: true }),
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
                <Heading level="h2">{t("providers.title", "Providers")}</Heading>
            </div>
            <div className="overflow-x-auto">
                <Table>
                    <Table.Header className="!border-none">
                        <Table.Row>
                            <Table.HeaderCell>{t("providers.table.provider", "Provider")}</Table.HeaderCell>
                            <Table.HeaderCell>{t("providers.table.statistics", "Statistics")}</Table.HeaderCell>
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
                                    {t("providers.no_providers", "No providers found")}
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
