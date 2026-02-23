import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { STATISTICS_MODULE } from "../../../../../modules/statistics";
import StatisticsService from "../../../../../modules/statistics/service";
import type { UpdateOptionInput } from "../../../../validation/statistics/schemas";
import { hydrateOptionsWithDependencies } from "../../utils/option-graph";

/**
 * GET /admin/statistics/options/:id
 * Get a specific option
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const { data: options } = await query.graph(
        {
            entity: "statistics_option",
            filters: { id: req.params.id },
            ...req.queryConfig,
        },
        { throwIfKeyNotFound: true }
    );

    const hydratedOptions = await hydrateOptionsWithDependencies(query, options || []);

    res.json({ option: hydratedOptions[0] });
}

/**
 * POST /admin/statistics/options/:id
 * Update an option (including composite statistics fields)
 */
export async function POST(
    req: MedusaRequest<UpdateOptionInput>,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);

    const updateData: any = {
        id: req.params.id,
    };


    if (req.validatedBody.data !== undefined) {
        updateData.data = req.validatedBody.data;
    }
    if (req.validatedBody.visualization_config !== undefined) {
        updateData.visualization_config = req.validatedBody.visualization_config;
    }
    if (req.validatedBody.local_option_name !== undefined) {
        updateData.local_option_name = req.validatedBody.local_option_name;
    }
    if (req.validatedBody.cache_options !== undefined) {
        updateData.cache_options = req.validatedBody.cache_options;
    }


    if (req.validatedBody.parameter_config !== undefined) {
        updateData.parameter_config = req.validatedBody.parameter_config;
    }
    if (req.validatedBody.preset !== undefined) {
        updateData.preset = req.validatedBody.preset;
    }
    if (req.validatedBody.input_dependencies !== undefined) {
        updateData.input_dependencies = req.validatedBody.input_dependencies;
    }
    if (req.validatedBody.view_id !== undefined) {
        updateData.view_id = req.validatedBody.view_id;
    }

    const option = await statisticsService.updateStatisticsOptions(updateData);

    res.json({ option });
}

/**
 * DELETE /admin/statistics/options/:id
 * Delete an option (with composite statistics dependency validation)
 */
export async function DELETE(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);


    await statisticsService.validateOptionDeletion(req.params.id);


    await statisticsService.deleteStatisticsOptions(req.params.id);

    res.json({ id: req.params.id, deleted: true });
}
