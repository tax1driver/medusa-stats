import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateChartWorkflow, deleteChartWorkflow, type UpdateChartInput } from "../../../../../workflows/statistics";
import type { UpdateChartInput as UpdateChartBodyInput } from "../../../../validation/statistics/schemas";

/**
 * GET /admin/statistics/charts/:id
 * Get a specific chart
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

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

/**
 * POST /admin/statistics/charts/:id
 * Update a chart
 */
export async function POST(
    req: MedusaRequest<UpdateChartBodyInput>,
    res: MedusaResponse
) {
    const { result } = await updateChartWorkflow(req.scope).run({
        input: {
            id: req.params.id,
            ...req.validatedBody,
        } as UpdateChartInput
    });

    res.json({ chart: result });
}

/**
 * DELETE /admin/statistics/charts/:id
 * Delete a chart
 */
export async function DELETE(
    req: MedusaRequest,
    res: MedusaResponse
) {
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
