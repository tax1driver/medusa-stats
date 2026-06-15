import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { STATISTICS_MODULE } from "../../../../../../modules/statistics";
import StatisticsService from "../../../../../../modules/statistics/service";
import type { CloneOptionInput } from "../../../../../validation/statistics/schemas";


export async function POST(
    req: AuthenticatedMedusaRequest<CloneOptionInput>,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);

    const sourceId = req.params.id;
    const clonedOption = await statisticsService.cloneOption(sourceId, req.validatedBody);

    res.json({ option: clonedOption });
}
