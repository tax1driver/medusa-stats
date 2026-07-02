import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { updateChartWorkflow, deleteChartWorkflow, type UpdateChartInput } from "../../../../../workflows/statistics";
import type { UpdateChartInput as UpdateChartBodyInput } from "../../../../validation/statistics/schemas";
import { checkViewOwnership } from "../../utils/check-view-ownership";


export async function GET(
    req: AuthenticatedMedusaRequest,
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

    const { data: charts } = await query.graph(
        {
            entity: "statistics_chart",
            filters: { id: req.params.id },
            ...req.queryConfig,
        },
        { throwIfKeyNotFound: true }
    );

    res.json({ chart: charts[0] });
}


export async function POST(
    req: AuthenticatedMedusaRequest<UpdateChartBodyInput>,
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

    const { result } = await updateChartWorkflow(req.scope).run({
        input: {
            id: req.params.id,
            ...req.validatedBody,
        } as UpdateChartInput
    });

    res.json({ chart: result });
}


export async function DELETE(
    req: AuthenticatedMedusaRequest,
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

    await deleteChartWorkflow(req.scope).run({
        input: {
            id: req.params.id,
        }
    });

    res.json({
        id: req.params.id,
        object: "statistics_chart",
        deleted: true,
    });
}
