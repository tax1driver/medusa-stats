import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STATISTICS_MODULE } from "../../../../modules/statistics"
import type StatisticsService from "../../../../modules/statistics/service"

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse,
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE)
    const chartTypes = await statisticsService.getChartTypes()

    res.json({ chart_types: chartTypes })
}
