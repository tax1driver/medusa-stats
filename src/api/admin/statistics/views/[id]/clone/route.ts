import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { cloneViewWorkflow } from "../../../../../../workflows/statistics";
import type { CloneViewInput } from "../../../../../validation/statistics/schemas";

/**
 * POST /admin/statistics/views/:id/clone
 * Clone a view with its options
 */
export async function POST(
    req: MedusaRequest<CloneViewInput>,
    res: MedusaResponse
) {
    const { new_name, include_options = true } = req.validatedBody;

    const { result } = await cloneViewWorkflow(req.scope).run({
        input: {
            source_view_id: req.params.id,
            new_name,
            clone_metadata: include_options,
            clone_stats_data: include_options,
        }
    });

    res.json(result);
}
