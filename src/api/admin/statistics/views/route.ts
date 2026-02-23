import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createViewWithOptionsWorkflow } from "../../../../workflows/statistics";
import type { CreateViewInput, ListViewsQuery } from "../../../validation/statistics/schemas";

/**
 * GET /admin/statistics/views
 * List all statistics views
 */
export async function GET(
    req: MedusaRequest<ListViewsQuery>,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const {
        q,
        order,
        limit = 20,
        offset = 0,
    } = req.validatedQuery;

    const filters: Record<string, any> = {};

    if (typeof q === "string" && q.trim().length > 0) {
        const pattern = `%${q.trim()}%`;
        filters.$or = [
            { name: { $like: pattern } },
            { description: { $like: pattern } },
        ];
    }

    const numericOffset = Number(offset) || 0;
    const numericLimit = Number(limit) || 20;
    const sortField = typeof order === "string" && order.length > 0
        ? (order.startsWith("-") ? order.slice(1) : order)
        : "updated_at";
    const sortDirection = typeof order === "string" && order.startsWith("-") ? "DESC" : "ASC";

    const { data: views, metadata } = await query.graph({
        entity: "statistics_view",
        ...req.queryConfig,
        filters,
        pagination: {
            take: numericLimit,
            skip: numericOffset,
            order: {
                [sortField]: sortDirection,
            },
        },
    });

    res.json({
        views,
        count: metadata?.count ?? views.length,
        limit: numericLimit,
        offset: numericOffset,
    });
}

/**
 * POST /admin/statistics/views
 * Create a new statistics view with options
 */
export async function POST(
    req: MedusaRequest<CreateViewInput>,
    res: MedusaResponse
) {
    const { options, description, stats_data, layout_config, period_type, period_config, interval, ...rest } = req.validatedBody;

    const { result } = await createViewWithOptionsWorkflow(req.scope).run({
        input: {
            view: {
                ...rest,
                description: description || undefined,
                stats_data: stats_data || undefined,
                layout_config: layout_config || undefined,
                period_type: period_type || undefined,
                period_config: period_config || undefined,
                interval: interval || undefined,
            },
            options: (options || []).map(opt => ({
                provider_id: opt.provider_id,
                provider_option_name: opt.statistic_key,
                local_option_name: opt.statistic_key,
                data: opt.data || {},
            })),
        }
    });

    res.json(result);
}
