import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";


export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const { data: logs, metadata } = await query.graph({
        entity: "statistics_alert_log",
        filters: { alert_id: req.params.id },
        ...req.queryConfig,
    });

    res.json({
        logs,
        count: metadata?.count,
        limit: metadata?.take,
        offset: metadata?.skip
    });
}
