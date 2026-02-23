import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * GET /admin/statistics/alert-logs
 * List all alert logs
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);


    const { severity, alert_id } = req.validatedQuery as { severity?: string; alert_id?: string };


    const filters: any = {};
    if (alert_id) {
        filters.alert_id = alert_id;
    }
    if (severity) {
        filters.alert = {
            severity
        };
    }

    const { data: logs, metadata } = await query.graph({
        entity: "statistics_alert_log",
        filters,
        ...req.queryConfig,
    });

    res.json({
        logs,
        count: metadata?.count,
        limit: metadata?.take,
        offset: metadata?.skip
    });
}
