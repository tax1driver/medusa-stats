import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STATISTICS_MODULE } from "../../../../modules/statistics"
import type StatisticsService from "../../../../modules/statistics/service"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { Query } from "@medusajs/framework"

interface CalculateStatisticEntry {
    provider_id: string
    key: string
    params?: Record<string, any>
}

interface CalculateBody {
    statistics: CalculateStatisticEntry[]
    periodStart: string
    periodEnd: string
    interval: number
}

export async function POST(
    req: MedusaRequest<CalculateBody>,
    res: MedusaResponse,
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const { statistics, periodStart, periodEnd, interval } = req.validatedBody
    const results: Record<string, any> = {}

    for (const entry of statistics) {
        try {
            const provider = statisticsService.getProvider(
                entry.provider_id,
                query as Query,
            )

            const result = await provider.calculate({
                id: entry.key,
                parameters: entry.params || {},
                periodStart: new Date(periodStart),
                periodEnd: new Date(periodEnd),
                interval,
            })

            results[entry.key] = result
        } catch (err: any) {
            results[entry.key] = {
                error: err.message || "Calculation failed",
            }
        }
    }

    res.json({ results })
}
