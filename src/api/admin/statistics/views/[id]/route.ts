import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { STATISTICS_MODULE } from "../../../../../modules/statistics";
import StatisticsService from "../../../../../modules/statistics/service";
import { updateViewConfigurationWorkflow } from "../../../../../workflows/statistics";
import { hydrateOptionsWithDependencies } from "../../utils/option-graph";
import type { UpdateViewInput } from "../../../../validation/statistics/schemas";
import { logger } from "@medusajs/framework";


export async function GET(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const viewId = req.params.id;
    const userId = req.auth_context.actor_id;

    const { data: views } = await query.graph(
        {
            entity: "statistics_view",
            fields: [
                "*",
                "charts.*",
                "charts.statistics.*",
                "charts.statistics.provider.*",
                "charts.statistics.input_dependencies.*",
                "charts.statistics.input_dependencies.input_option.*",
                "user.id",
            ],
            filters: { id: viewId },
        },
        { throwIfKeyNotFound: true }
    );

    const view = { ...views[0] };

    if (view.is_private) {
        const linkedUserId = view.user.id;
        if (linkedUserId !== userId) {
            throw new MedusaError(
                MedusaError.Types.NOT_ALLOWED,
                "You do not have access to this private view",
            );
        }
    }

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


export async function POST(
    req: AuthenticatedMedusaRequest<UpdateViewInput>,
    res: MedusaResponse
) {
    const viewId = req.params.id;
    const userId = req.auth_context.actor_id;

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const { data: userLinks } = await query.graph({
        entity: "statistics_view",
        fields: ["id", "is_private", "user.id"],
        filters: { id: viewId },
    });

    const viewData = userLinks[0] as any;
    if (!viewData) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "View not found");
    }

    if (viewData.is_private) {
        const linkedUserId = viewData.user.id;
        if (linkedUserId !== userId) {
            throw new MedusaError(
                MedusaError.Types.NOT_ALLOWED,
                "You do not have access to this private view",
            );
        }
    }

    const { description, stats_data, layout_config, period_type, period_config, interval, ...rest } = req.validatedBody;

    const { result } = await updateViewConfigurationWorkflow(req.scope).run({
        input: {
            id: viewId,
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


export async function DELETE(
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse
) {
    const viewId = req.params.id;
    const userId = req.auth_context.actor_id;

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const { data: userLinks } = await query.graph({
        entity: "statistics_view",
        fields: ["id", "is_private", "user.id"],
        filters: { id: viewId },
    });

    const viewData = userLinks[0] as any;
    if (!viewData) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "View not found");
    }

    if (viewData.is_private) {
        const linkedUserId = viewData.user.id;
        if (linkedUserId !== userId) {
            throw new MedusaError(
                MedusaError.Types.NOT_ALLOWED,
                "You do not have access to this private view",
            );
        }
    }

    const statisticsService = req.scope.resolve<StatisticsService>(STATISTICS_MODULE);

    await statisticsService.deleteStatisticsViews(viewId);

    res.json({ id: viewId, deleted: true });
}
