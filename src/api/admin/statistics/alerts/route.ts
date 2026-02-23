import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { STATISTICS_MODULE } from "../../../../modules/statistics";
import { createAlertWorkflow } from "../../../../workflows/statistics";
import type { CreateAlertInput, ListAlertsQuery } from "../../../validation/statistics/schemas";

/**
 * GET /admin/statistics/alerts
 * List all alerts
 */
export async function GET(
    req: MedusaRequest<ListAlertsQuery>,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    const {
        option_id,
        severity,
        is_enabled,
        q,
        order,
        limit = 20,
        offset = 0,
    } = req.validatedQuery;

    const filters: Record<string, any> = {};

    if (option_id) {
        filters.option = { id: option_id };
    }

    if (severity) {
        filters.severity = severity;
    }

    if (typeof is_enabled === "boolean") {
        filters.is_enabled = is_enabled;
    }

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
        : "created_at";
    const sortDirection = typeof order === "string" && order.startsWith("-") ? "DESC" : "ASC";

    const { data: alerts, metadata } = await query.graph({
        entity: "statistics_alert",
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
        alerts,
        count: metadata?.count ?? alerts.length,
        limit: numericLimit,
        offset: numericOffset,
    });
}

/**
 * POST /admin/statistics/alerts
 * Create a new alert
 */
export async function POST(
    req: MedusaRequest<CreateAlertInput>,
    res: MedusaResponse
) {
    const { description, condition, severity, user_ids, period, interval, metadata, ...rest } = req.validatedBody;


    const workflowSeverity = severity === "error" ? "critical" as const : severity;


    const normalizedCondition: {
        operator: "lt" | "gt" | "lte" | "gte" | "eq" | "neq" | "between";
        comparisonType: "absolute" | "relative";
        threshold?: number | [number, number];
        lookbackPositions?: number;
        changeType?: "absolute" | "percentage";
    } = {
        ...condition,
        threshold: Array.isArray(condition.threshold) && condition.threshold.length === 2
            ? [condition.threshold[0], condition.threshold[1]] as [number, number]
            : condition.threshold as number | undefined
    };

    const { result } = await createAlertWorkflow(req.scope).run({
        input: {
            ...rest,
            description: description || undefined,
            condition: normalizedCondition,
            period,
            interval,
            severity: workflowSeverity,
            metadata,
        }
    });


    if (user_ids && user_ids.length > 0) {
        const link = req.scope.resolve(ContainerRegistrationKeys.LINK);

        await link.create({
            [STATISTICS_MODULE]: {
                statistics_alert_id: result.id,
            },
            [Modules.USER]: user_ids.map(id => ({
                user_id: id,
            })),
        });
    }

    res.json(result);
}
