import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { STATISTICS_MODULE } from "../../../../../modules/statistics";
import StatisticsService from "../../../../../modules/statistics/service";
import type { UpdateOptionInput } from "../../../../validation/statistics/schemas";
import { hydrateOptionsWithDependencies } from "../../utils/option-graph";
import { checkViewOwnership } from "../../utils/check-view-ownership";


export async function GET(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const userId = req.auth_context.actor_id;

    const { data: optionView } = await query.graph({
        entity: "statistics_option",
        fields: ["id", "view.id"],
        filters: { id: req.params.id },
    });

    const viewId = (optionView[0] as any)?.view?.id;
    if (viewId) {
        if (!(await checkViewOwnership(req.scope, viewId, userId))) {
            throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "You do not have access to this private view");
        }
    }

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


export async function POST(
    req: AuthenticatedMedusaRequest<UpdateOptionInput>,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const userId = req.auth_context.actor_id;

    const { data: optionView } = await query.graph({
        entity: "statistics_option",
        fields: ["id", "view.id"],
        filters: { id: req.params.id },
    });

    const viewId = req.validatedBody.view_id || (optionView[0] as any)?.view?.id;
    if (viewId) {
        if (!(await checkViewOwnership(req.scope, viewId, userId))) {
            throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "You do not have access to this private view");
        }
    }

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

export async function DELETE(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const userId = req.auth_context.actor_id;

    const { data: optionView } = await query.graph({
        entity: "statistics_option",
        fields: ["id", "view.id"],
        filters: { id: req.params.id },
    });

    const viewId = (optionView[0] as any)?.view?.id;
    if (viewId) {
        if (!(await checkViewOwnership(req.scope, viewId, userId))) {
            throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "You do not have access to this private view");
        }
    }


    await statisticsService.validateOptionDeletion(req.params.id);
    await statisticsService.deleteStatisticsOptions(req.params.id);

    res.json({ id: req.params.id, deleted: true });
}
