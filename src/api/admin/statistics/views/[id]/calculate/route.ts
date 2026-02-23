import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { calculateViewWorkflow } from "../../../../../../workflows/statistics";
import type { CalculateViewInput } from "../../../../../validation/statistics/schemas";

/**
 * POST /admin/statistics/views/:id/calculate
 * Calculate statistics for a view
 */
export async function POST(
    req: MedusaRequest<CalculateViewInput>,
    res: MedusaResponse
) {
    const { periodStart, periodEnd, interval } = req.validatedBody;

    const { result } = await calculateViewWorkflow(req.scope).run({
        input: {
            view_id: req.params.id,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            interval,
        }
    });

    res.json(result);
}
