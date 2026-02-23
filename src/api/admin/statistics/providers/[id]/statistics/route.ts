import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getAvailableStatisticsWorkflow } from "../../../../../../workflows/statistics/get-available-statistics";

/**
 * GET /admin/statistics/providers/:id/statistics
 * Get available statistics from a provider
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { result } = await getAvailableStatisticsWorkflow(req.scope).run({
        input: {
            provider_id: req.params.id === "all" ? undefined : req.params.id,
        }
    });


    const statistics = Object.values(result).flat();

    res.json({ statistics });
}
