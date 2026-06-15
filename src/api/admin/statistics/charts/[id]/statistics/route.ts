import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { manageChartStatisticsWorkflow } from "../../../../../../workflows/statistics";


export async function PUT(
    req: MedusaRequest<{ statistic_ids: string[] }>,
    res: MedusaResponse
) {
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
    req: MedusaRequest<{ statistic_ids: string[] }>,
    res: MedusaResponse
) {
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
