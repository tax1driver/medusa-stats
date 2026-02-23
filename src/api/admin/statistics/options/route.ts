import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { STATISTICS_MODULE } from "../../../../modules/statistics";
import StatisticsService from "../../../../modules/statistics/service";
import type { CreateOptionInput, ListOptionsQuery } from "../../../validation/statistics/schemas";
import { hydrateOptionsWithDependencies } from "../utils/option-graph";

/**
 * GET /admin/statistics/options
 * List all statistics options
 */
export async function GET(
    req: MedusaRequest<ListOptionsQuery>,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

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

/**
 * POST /admin/statistics/options
 * Create a new statistics option
 */
export async function POST(
    req: MedusaRequest<CreateOptionInput>,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);

    const { data, input_dependencies, ...rest } = req.validatedBody;
    const createData: any = {
        ...rest,
        data: data || {},
    };

    // Handle input_dependencies if provided
    if (input_dependencies && input_dependencies.length > 0) {
        createData.input_dependencies = input_dependencies;
    }

    const option = await statisticsService.createStatisticsOptions(createData);

    // Link option to current user if authenticated
    // Note: auth_context should be available through middleware
    const actorId = (req as any).auth_context?.actor_id;
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
