import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { calculateSingleStatisticWorkflow } from "../../../../../../workflows/statistics";
import type { CalculateOptionInput } from "../../../../../validation/statistics/schemas";

/**
 * POST /admin/statistics/options/:id/calculate
 * Calculate a single statistic
 */
export async function POST(
    req: MedusaRequest<CalculateOptionInput>,
    res: MedusaResponse
) {
    const { periodStart, periodEnd, parameters, cache_options_override, interval } = req.validatedBody;

    const { result } = await calculateSingleStatisticWorkflow(req.scope).run({
        input: {
            option_id: req.params.id,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            interval,
            runtimeParameters: parameters || undefined,
            cache_options_override: cache_options_override || undefined,
        }
    });

    res.json(result);
}
