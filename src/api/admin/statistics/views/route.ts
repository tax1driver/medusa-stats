import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createViewWithOptionsWorkflow } from "../../../../workflows/statistics";
import type { CreateViewInput, ListViewsQuery } from "../../../validation/statistics/schemas";

export async function GET(
    req: AuthenticatedMedusaRequest<ListViewsQuery>,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const userId = req.auth_context.actor_id;

    const {
        q,
        limit: rawLimit,
        offset: rawOffset,
    } = req.validatedQuery;

    const limit = Number(rawLimit) || 10;
    const offset = Number(rawOffset) || 0;

    const filters: Record<string, any> = {};

    if (typeof q === "string" && q.trim().length > 0) {
        const pattern = `%${q.trim()}%`;
        filters.$or = [
            { name: { $like: pattern } },
            { description: { $like: pattern } },
        ];
    }

    const results: any[] = [];
    let totalSkipped = 0;

    while (results.length < limit) {
        const { data: batch } = await query.graph({
            entity: "statistics_view",
            fields: [
                ...(req.queryConfig.fields || []),
                "is_private",
                "user.*",
            ],
            filters,
            pagination: {
                take: Math.max(limit, 50),
                skip: offset + totalSkipped + results.length,
            },
        });

        if (batch.length === 0) break;

        for (const view of batch) {
            const linkedUsers = Array.isArray(view.user) ? view.user : [view.user];
            if (view.is_private && !linkedUsers.some((u: any) => u?.id === userId)) {
                totalSkipped++;
                continue;
            }
            if (results.length < limit) {
                results.push(view);
            }
        }

        if (batch.length < Math.max(limit, 50)) break;
    }

    res.json({
        views: results,
        count: results.length + totalSkipped,
    });
}


export async function POST(
    req: AuthenticatedMedusaRequest<CreateViewInput>,
    res: MedusaResponse
) {
    const { options, description, stats_data, layout_config, period_type, period_config, interval, is_private, ...rest } = req.validatedBody;
    const userId = req.auth_context.actor_id;

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
                is_private: is_private ?? false,
                created_by: userId,
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
