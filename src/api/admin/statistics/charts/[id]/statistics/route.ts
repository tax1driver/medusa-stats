import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { manageChartStatisticsWorkflow } from "../../../../../../workflows/statistics";
import { checkViewOwnership } from "../../../utils/check-view-ownership";


export async function PUT(
    req: AuthenticatedMedusaRequest<{ statistic_ids: string[] }>,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const userId = req.auth_context.actor_id;

    const { data: chartView } = await query.graph({
        entity: "statistics_chart",
        fields: ["id", "view.id"],
        filters: { id: req.params.id },
    });

    const viewId = (chartView[0] as any)?.view?.id;
    if (viewId) {
        if (!(await checkViewOwnership(req.scope, viewId, userId))) {
            throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "You do not have access to this private view");
        }
    }

    const { statistic_ids } = req.validatedBody;

    await manageChartStatisticsWorkflow(req.scope).run({
        input: {
            chart_id: req.params.id,
            add_statistic_ids: statistic_ids,
        }
    });

    res.json({
        success: true,
        added: statistic_ids.length,
    });
}


export async function DELETE(
    req: AuthenticatedMedusaRequest<{ statistic_ids: string[] }>,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const userId = req.auth_context.actor_id;
    const { data: chartView } = await query.graph({
        entity: "statistics_chart",
        fields: ["id", "view.id"],
        filters: { id: req.params.id },
    });

    const viewId = (chartView[0] as any)?.view?.id;
    if (viewId) {
        if (!(await checkViewOwnership(req.scope, viewId, userId))) {
            throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "You do not have access to this private view");
        }
    }

    const { statistic_ids } = req.validatedBody;

    await manageChartStatisticsWorkflow(req.scope).run({
        input: {
            chart_id: req.params.id,
            remove_statistic_ids: statistic_ids,
        }
    });

    res.json({
        success: true,
        removed: statistic_ids.length,
    });
}
