import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules, MedusaError } from "@medusajs/framework/utils";
import { STATISTICS_MODULE } from "../../../../modules/statistics";
import StatisticsService from "../../../../modules/statistics/service";
import type { CreateOptionInput, ListOptionsQuery } from "../../../validation/statistics/schemas";
import { hydrateOptionsWithDependencies } from "../utils/option-graph";
import { checkViewOwnership } from "../utils/check-view-ownership";


export async function GET(
    req: AuthenticatedMedusaRequest<ListOptionsQuery>,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const userId = req.auth_context.actor_id;

    const {
        view_id,
        provider_id,
        preset,
        has_dependencies,
        q,
        order,
        limit = 20,
        offset = 0,
    } = req.validatedQuery;

    const filters: Record<string, any> = {};

    if (view_id) {
        filters.view = { id: view_id };
        if (!(await checkViewOwnership(req.scope, view_id as string, req.auth_context.actor_id))) {
            throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "You do not have access to this private view");
        }
    }

    if (provider_id) {
        filters.provider = { id: provider_id };
    }

    if (typeof preset === "boolean") {
        filters.preset = preset;
    }

    if (has_dependencies === true) {
        filters.input_dependencies = { id: { $ne: null } };
    }

    if (typeof q === "string" && q.trim().length > 0) {
        const pattern = `%${q.trim()}%`;
        filters.$or = [
            { local_option_name: { $like: pattern } },
            { provider_option_name: { $like: pattern } },
        ];
    }

    const numericOffset = Number(offset) || 0;
    const numericLimit = Number(limit) || 20;
    const sortField = typeof order === "string" && order.length > 0
        ? (order.startsWith("-") ? order.slice(1) : order)
        : "updated_at";
    const sortDirection = typeof order === "string" && order.startsWith("-") ? "DESC" : "ASC";

    const [options, count] = await statisticsService.listAndCountStatisticsOptions(filters, {
        skip: numericOffset,
        take: numericLimit,
        order: {
            [sortField]: sortDirection,
        },
        relations: ["provider", "input_dependencies", "input_dependencies.input_option", "input_dependencies.input_option.provider"],
    });

    const hydratedOptions = await hydrateOptionsWithDependencies(query, options || []);

    res.json({
        options: hydratedOptions,
        count,
        limit: numericLimit,
        offset: numericOffset,
    });
}


export async function POST(
    req: AuthenticatedMedusaRequest<CreateOptionInput>,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);
    const userId = req.auth_context.actor_id;

    const { data, input_dependencies, ...rest } = req.validatedBody;
    const createData: any = {
        ...rest,
        data: data || {},
    };


    if (input_dependencies && input_dependencies.length > 0) {
        createData.input_dependencies = input_dependencies;
    }

    if (createData.view_id) {
        if (!(await checkViewOwnership(req.scope, createData.view_id, userId))) {
            throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "You do not have access to this private view");
        }
    }

    const option = await statisticsService.createStatisticsOptions(createData);



    const actorId = userId;
    if (actorId) {
        const link = req.scope.resolve(ContainerRegistrationKeys.LINK);

        await link.create({
            [STATISTICS_MODULE]: {
                statistics_option_id: option.id,
            },
            [Modules.USER]: {
                user_id: actorId,
            },
        });
    }

    res.json({ option });
}
