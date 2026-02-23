import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { STATISTICS_MODULE } from "../../../../../modules/statistics";
import StatisticsService from "../../../../../modules/statistics/service";
import type { UpdateAlertInput } from "../../../../validation/statistics/schemas";

/**
 * GET /admin/statistics/alerts/:id
 * Get a specific alert
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const { data: alerts } = await query.graph(
        {
            entity: "statistics_alert",
            filters: { id: req.params.id },
            ...req.queryConfig,
        },
        { throwIfKeyNotFound: true }
    );

    res.json({ alert: alerts[0] });
}

/**
 * POST /admin/statistics/alerts/:id
 * Update an alert
 */
export async function POST(
    req: MedusaRequest<UpdateAlertInput>,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);

    const { description, severity, condition, period, interval, metadata, ...rest } = req.validatedBody;


    const workflowSeverity = severity === "error" ? "critical" : severity;

    const updateData: any = {
        id: req.params.id,
        ...rest,
    };

    if (description !== undefined) updateData.description = description || undefined;
    if (severity) updateData.severity = workflowSeverity;
    if (condition) updateData.condition = condition;
    if (period) updateData.period = period;
    if (interval !== undefined) updateData.interval = interval;

    if (metadata) {
        const existingAlert = await statisticsService.retrieveStatisticsAlert(req.params.id, {
            select: ["id", "metadata"],
        } as any);

        updateData.metadata = {
            ...(existingAlert?.metadata || {}),
            ...(metadata || {}),
        };
    }

    const alert = await statisticsService.updateStatisticsAlerts(updateData);

    res.json({ alert });
}

/**
 * DELETE /admin/statistics/alerts/:id
 * Delete an alert
 */
export async function DELETE(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);

    await statisticsService.deleteStatisticsAlerts(req.params.id);

    res.json({ id: req.params.id, deleted: true });
}
