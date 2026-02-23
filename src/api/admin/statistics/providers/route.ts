import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { STATISTICS_MODULE } from "../../../../modules/statistics";
import StatisticsService from "../../../../modules/statistics/service";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { Query } from "@medusajs/framework";
import type { ListProvidersQuery } from "../../../validation/statistics/schemas";

/**
 * GET /admin/statistics/providers
 * List all statistics providers
 */
export async function GET(
    req: MedusaRequest<ListProvidersQuery>,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const {
        is_enabled,
        q,
        order,
        limit = 20,
        offset = 0,
    } = req.validatedQuery;

    const filters: Record<string, any> = {};

    if (typeof is_enabled === "boolean") {
        filters.is_enabled = is_enabled;
    }

    if (typeof q === "string" && q.trim().length > 0) {
        filters.id = { $like: `%${q.trim()}%` };
    }

    const numericOffset = Number(offset) || 0;
    const numericLimit = Number(limit) || 20;
    const sortField = typeof order === "string" && order.length > 0
        ? (order.startsWith("-") ? order.slice(1) : order)
        : "id";
    const sortDirection = typeof order === "string" && order.startsWith("-") ? "DESC" : "ASC";

    const [providers, count] = await statisticsService.listAndCountStatisticsProviders(filters, {
        skip: numericOffset,
        take: numericLimit,
        order: {
            [sortField]: sortDirection,
        },
    });

    const providersWithAvailableStats = await Promise.all(providers.map(async (provider) => {
        try {
            const providerInstance = statisticsService.getProvider(provider.id, query as Query);
            const availableStats = await providerInstance.getAvailableStatistics();

            return {
                ...provider,
                statistics: availableStats,
            }
        } catch (e) {
            return {
                ...provider,
                statistics: []
            }
        }
    }));

    res.json({
        providers: providersWithAvailableStats,
        count,
        limit: numericLimit,
        offset: numericOffset,
    });
}
