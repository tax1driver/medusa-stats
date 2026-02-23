import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { CreateChartInput, ListChartsQuery } from "../../../../api/validation/statistics/schemas";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createChartWorkflow } from "../../../../workflows/statistics";

export async function GET(
    req: MedusaRequest<ListChartsQuery>,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

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
    req: MedusaRequest<CreateChartInput>,
    res: MedusaResponse
) {
    const chartData = req.validatedBody;

    const { result } = await createChartWorkflow(req.scope).run({
        input: {
            ...chartData,
        }
    });

    res.json({ chart: result });
}
