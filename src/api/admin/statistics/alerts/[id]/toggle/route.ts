import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { STATISTICS_MODULE } from "../../../../../../modules/statistics";
import StatisticsService from "../../../../../../modules/statistics/service";

/**
 * POST /admin/statistics/alerts/:id/toggle
 * Toggle alert enabled status
 */
export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);

    const alert = await statisticsService.retrieveStatisticsAlert(req.params.id);

    const updated = await statisticsService.updateStatisticsAlerts({
        id: req.params.id,
        is_enabled: !alert.is_enabled
    });

    res.json({ alert: updated });
}
