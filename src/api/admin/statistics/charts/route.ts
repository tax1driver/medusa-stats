import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { CreateChartInput, ListChartsQuery } from "../../../../api/validation/statistics/schemas";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { createChartWorkflow } from "../../../../workflows/statistics";
import { checkViewOwnership } from "../utils/check-view-ownership";

export async function GET(
    req: AuthenticatedMedusaRequest<ListChartsQuery>,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const userId = req.auth_context.actor_id;

    const {
        view_id,
        q,
        order,
        limit = 20,
        offset = 0,
    } = req.validatedQuery;

    const filters: Record<string, any> = {};

    if (view_id) {
        filters.view = { id: view_id };
        if (!(await checkViewOwnership(req.scope, view_id as string, userId))) {
            throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "You do not have access to this private view");
        }
    }

    if (typeof q === "string" && q.trim().length > 0) {
        const pattern = `%${q.trim()}%`;
        filters.$or = [
            { name: { $like: pattern } },
            { description: { $like: pattern } },
        ];
    }

    const numericOffset = Number(offset) || 0;
    const numericLimit = Number(limit) || 20;
    const sortField = typeof order === "string" && order.length > 0
        ? (order.startsWith("-") ? order.slice(1) : order)
        : "updated_at";
    const sortDirection = typeof order === "string" && order.startsWith("-") ? "DESC" : "ASC";

    const { data: charts, metadata } = await query.graph({
        entity: "statistics_chart",
        ...req.queryConfig,
        filters,
        pagination: {
            take: numericLimit,
            skip: numericOffset,
            order: {
                [sortField]: sortDirection,
            },
        },
    });

    res.json({
        charts,
        count: metadata?.count ?? charts.length,
        limit: numericLimit,
        offset: numericOffset,
    });
}

export async function POST(
    req: AuthenticatedMedusaRequest<CreateChartInput>,
    res: MedusaResponse
) {
    const chartData = req.validatedBody;
    const userId = req.auth_context.actor_id;

    if (chartData.view_id) {
        if (!(await checkViewOwnership(req.scope, chartData.view_id, userId))) {
            throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "You do not have access to this private view");
        }
    }

    const { result } = await createChartWorkflow(req.scope).run({
        input: {
            ...chartData,
        }
    });

    res.json({ chart: result });
}
