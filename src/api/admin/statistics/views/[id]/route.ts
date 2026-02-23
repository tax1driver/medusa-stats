import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { STATISTICS_MODULE } from "../../../../../modules/statistics";
import StatisticsService from "../../../../../modules/statistics/service";
import { updateViewConfigurationWorkflow } from "../../../../../workflows/statistics";
import { hydrateOptionsWithDependencies } from "../../utils/option-graph";
import type { UpdateViewInput } from "../../../../validation/statistics/schemas";
import { logger } from "@medusajs/framework";


/**
 * GET /admin/statistics/views/:id
 * Get a specific view
 */
export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const viewId = req.params.id;

    const { data: views } = await query.graph(
        {
            entity: "statistics_view",
            filters: { id: viewId },
            ...req.queryConfig,
        },
        { throwIfKeyNotFound: true }
    );

    const view = { ...views[0] };


    const rootOptions: any[] = [];

    view.charts.forEach((chart: any) => {
        chart.statistics.forEach((stat: any) => {
            if (stat.id) {
                rootOptions.push(stat);
            }
        });
    });


    const hydratedOptions = await hydrateOptionsWithDependencies(query, rootOptions);
    const optionMap = new Map<string, any>(
        hydratedOptions
            .filter((option: any) => Boolean(option?.id))
            .map((option: any) => [option.id, option])
    );

    view.statistics = Array.from(rootOptions).map((stat) => optionMap.get(stat.id)).filter(Boolean);
    view.charts = view.charts.map((chart: any) => ({
        ...chart,
        statistics: chart.statistics.map((stat: any) => optionMap.get(stat.id) || stat),
    }));

    res.json({ view });
}

/**
 * POST /admin/statistics/views/:id
 * Update a view
 */
export async function POST(
    req: MedusaRequest<UpdateViewInput>,
    res: MedusaResponse
) {
    const { description, stats_data, layout_config, period_type, period_config, interval, ...rest } = req.validatedBody;

    const { result } = await updateViewConfigurationWorkflow(req.scope).run({
        input: {
            id: req.params.id,
            ...rest,
            description: description || undefined,
            stats_data: stats_data || undefined,
            layout_config: layout_config || undefined,
            period_type: period_type || undefined,
            period_config: period_config || undefined,
            interval: interval || undefined,
        }
    });

    res.json(result);
}

/**
 * DELETE /admin/statistics/views/:id
 * Delete a view
 */
export async function DELETE(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);

    await statisticsService.deleteStatisticsViews(req.params.id);

    res.json({ id: req.params.id, deleted: true });
}
