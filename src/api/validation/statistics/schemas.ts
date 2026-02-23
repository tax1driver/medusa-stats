import { z } from "zod";
import { createFindParams } from "@medusajs/medusa/api/utils/validators";

/**
 * Common schemas
 */

export const PaginationSchema = createFindParams({
    limit: 20,
    offset: 0,
});


export const ExpandSchema = z.object({
    fields: z.string().optional(),
});

/**
 * Provider Validation Schemas
 */

export const ListProvidersQuerySchema = PaginationSchema.extend({
    q: z.string().optional(),
    order: z.string().optional(),
    is_enabled: z.preprocess(
        (val) => {
            if (val === "true") return true;
            if (val === "false") return false;
            return val;
        },
        z.boolean().optional()
    ),
}).merge(ExpandSchema);

export const GetProviderQuerySchema = ExpandSchema;

export const GetProviderStatisticsQuerySchema = z.object({
    sales_channel_id: z.string().optional(),
});

/**
 * View Validation Schemas
 */

export const ListViewsQuerySchema = PaginationSchema.extend({
    q: z.string().optional(),
    order: z.string().optional(),
}).merge(ExpandSchema);

export const ListChartsQuerySchema = PaginationSchema.extend({
    view_id: z.string().optional(),
    q: z.string().optional(),
    order: z.string().optional(),
}).merge(ExpandSchema);

export const CreateViewSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional().nullable(),
    stats_data: z.record(z.any()).optional().nullable(),
    layout_config: z.record(z.any()).optional().nullable(),
    period_type: z.enum(["rolling", "calendar", "custom"]).optional(),
    period_config: z.record(z.any()).optional().nullable(),
    interval: z.number().optional(),
    options: z.array(
        z.object({
            provider_id: z.string().min(1, "Provider ID is required"),
            statistic_key: z.string().min(1, "Statistic key is required"),
            data: z.record(z.any()).optional().nullable(),
        })
    ).optional(),
});

export const UpdateViewSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    stats_data: z.record(z.any()).optional().nullable(),
    layout_config: z.record(z.any()).optional().nullable(),
    period_type: z.enum(["rolling", "calendar", "custom"]).optional(),
    period_config: z.record(z.any()).optional().nullable(),
    interval: z.number().optional(),
    cache_options: z.object({
        enabled: z.boolean().optional(),
        ttl: z.number().optional(),
    }).optional().nullable(),
});

export const GetViewQuerySchema = ExpandSchema;

export const CalculateViewSchema = z.object({
    periodStart: z.string().datetime("Invalid start date"),
    periodEnd: z.string().datetime("Invalid end date"),
    interval: z.number(),
});

export const CloneViewSchema = z.object({
    new_name: z.string().min(1, "New name is required"),
    include_options: z.boolean().optional(),
});

/**
 * Option Validation Schemas
 */


export const InputDependencySchema = z.object({
    input_option_id: z.string().min(1, "Input option ID is required"),
    parameter_name: z.string().min(1, "Parameter name is required").nullable(),
    order: z.number().int().optional(),
    metadata: z.record(z.any()).optional().nullable(),
});


export const ParameterConfigSchema = z.record(
    z.object({
        value: z.any(),
        locked: z.boolean().default(false),
    })
);

export const ListOptionsQuerySchema = PaginationSchema.extend({
    view_id: z.string().optional(),
    provider_id: z.string().optional(),
    q: z.string().optional(),
    order: z.string().optional(),

    preset: z.preprocess(
        (val) => {
            if (val === "true") return true;
            if (val === "false") return false;
            return val;
        },
        z.boolean().optional()
    ),
    has_dependencies: z.preprocess(
        (val) => {
            if (val === "true") return true;
            if (val === "false") return false;
            return val;
        },
        z.boolean().optional()
    ),
}).merge(ExpandSchema);

export const CreateOptionSchema = z.object({
    view_id: z.string().min(1, "View ID is required").optional(),
    provider_id: z.string().min(1, "Provider ID is required"),
    provider_option_name: z.string().min(1, "Provider option name is required"),
    data: z.record(z.any()).optional().nullable(),
    local_option_name: z.string().optional(),

    parameter_config: ParameterConfigSchema.optional().nullable(),
    preset: z.boolean().optional().default(false),
    input_dependencies: z.array(InputDependencySchema).optional(),
});

export const UpdateOptionSchema = z.object({
    data: z.record(z.any()).optional().nullable(),
    local_option_name: z.string().min(1).optional(),
    visualization_config: z.record(z.any()).optional().nullable(),
    cache_options: z.object({
        enabled: z.boolean().optional(),
        ttl: z.number().optional(),
    }).optional().nullable(),

    parameter_config: ParameterConfigSchema.optional().nullable(),
    preset: z.boolean().optional(),
    input_dependencies: z.array(InputDependencySchema).optional(),
    view_id: z.string().optional(),
});


export const CloneOptionSchema = z.object({
    local_option_name: z.string().optional(),
    parameter_config: ParameterConfigSchema.optional().nullable(),
    preset: z.boolean().optional().default(false),
});

export const GetOptionQuerySchema = ExpandSchema;

export const CalculateOptionSchema = z.object({
    periodStart: z.string().datetime("Invalid start date"),
    periodEnd: z.string().datetime("Invalid end date"),
    interval: z.number(),
    onlyCompleteData: z.boolean().optional(),
    parameters: z.record(z.any()).optional().nullable(),
    cache_options_override: z.object({
        enabled: z.boolean().optional(),
        ttl: z.number().optional(),
    }).optional().nullable(),
});

/**
 * Snapshot Validation Schemas
 */


/**
 * Alert Validation Schemas
 */

export const ListAlertsQuerySchema = PaginationSchema.extend({
    option_id: z.string().optional(),
    severity: z.enum(["info", "warning", "error"]).optional(),
    q: z.string().optional(),
    order: z.string().optional(),
    is_enabled: z.preprocess(
        (val) => {
            if (val === "true") return true;
            if (val === "false") return false;
            return val;
        },
        z.boolean().optional()
    ),
}).merge(ExpandSchema);

export const CreateAlertSchema = z.object({
    option_id: z.string().min(1, "Option ID is required"),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional().nullable(),
    condition: z.object({
        operator: z.enum(["lt", "gt", "lte", "gte", "eq", "neq", "between"]),
        comparisonType: z.enum(["absolute", "relative"]),
        threshold: z.union([z.number(), z.array(z.number()).length(2)]).optional(),
        lookbackPositions: z.number().positive().int().optional(),
        changeType: z.enum(["absolute", "percentage"]).optional()
    }),
    period: z.object({
        type: z.enum(["calendar", "custom"]),
        config: z.union([
            z.object({
                reference: z.enum(["today", "yesterday", "wtd", "lastweek", "mtd", "lastmonth", "qtd", "lastquarter", "ytd", "lastyear"])
            }),
            z.object({
                start: z.string().or(z.date()),
                end: z.string().or(z.date())
            })
        ])
    }).optional(),
    interval: z.number().positive().optional(),
    severity: z.enum(["info", "warning", "error"]),
    is_enabled: z.boolean().optional(),
    user_ids: z.array(z.string()).optional(),
    metadata: z.record(z.any()).optional(),
});

export const UpdateAlertSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    condition: z.object({
        operator: z.enum(["lt", "gt", "lte", "gte", "eq", "neq", "between"]).optional(),
        comparisonType: z.enum(["absolute", "relative"]).optional(),
        threshold: z.union([z.number(), z.array(z.number()).length(2)]).optional(),
        lookbackPositions: z.number().positive().int().optional(),
        changeType: z.enum(["absolute", "percentage"]).optional()
    }).optional(),
    period: z.object({
        type: z.enum(["calendar", "custom"]),
        config: z.union([
            z.object({
                reference: z.enum(["today", "yesterday", "wtd", "lastweek", "mtd", "lastmonth", "qtd", "lastquarter", "ytd", "lastyear"])
            }),
            z.object({
                start: z.string().or(z.date()),
                end: z.string().or(z.date())
            })
        ])
    }).optional(),
    interval: z.number().positive().optional(),
    severity: z.enum(["info", "warning", "error"]).optional(),
    is_enabled: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
});

export const GetAlertQuerySchema = ExpandSchema;

export const ListAlertLogsQuerySchema = PaginationSchema.extend({
    order: z.string().optional(),
});

/**
 * Alert Log Validation Schemas
 */

export const ListAlertLogsGlobalQuerySchema = PaginationSchema.extend({
    alert_id: z.string().optional(),
    severity: z.enum(["info", "warning", "critical"]).optional(),
    order: z.string().optional(),
}).merge(ExpandSchema);

export const GetAlertLogQuerySchema = ExpandSchema;

/**
 * Cache Validation Schemas
 */

export const InvalidateCacheSchema = z.object({

    view_id: z.string().optional(),
    option_id: z.string().optional(),


    options: z.array(z.object({
        option_id: z.string(),
        parameters: z.record(z.any())
    })).optional(),


    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    interval: z.number().int().positive(),


    parameters: z.record(z.any()).optional(),
}).refine(
    (data) => {

        const hasOptionTarget = data.option_id && data.parameters;
        const hasViewTarget = data.view_id && data.options;
        return hasOptionTarget || hasViewTarget;
    },
    {
        message: "Must provide either (option_id + parameters) or (view_id + options) along with state parameters",
    }
);


export type ListProvidersQuery = z.infer<typeof ListProvidersQuerySchema>;
export type GetProviderQuery = z.infer<typeof GetProviderQuerySchema>;
export type GetProviderStatisticsQuery = z.infer<typeof GetProviderStatisticsQuerySchema>;

export type ListViewsQuery = z.infer<typeof ListViewsQuerySchema>;
export type ListChartsQuery = z.infer<typeof ListChartsQuerySchema>;
export type CreateViewInput = z.infer<typeof CreateViewSchema>;
export type UpdateViewInput = z.infer<typeof UpdateViewSchema>;
export type GetViewQuery = z.infer<typeof GetViewQuerySchema>;
export type CalculateViewInput = z.infer<typeof CalculateViewSchema>;
export type CloneViewInput = z.infer<typeof CloneViewSchema>;

export type ListOptionsQuery = z.infer<typeof ListOptionsQuerySchema>;
export type InputDependency = z.infer<typeof InputDependencySchema>;
export type ParameterConfig = z.infer<typeof ParameterConfigSchema>;
export type CreateOptionInput = z.infer<typeof CreateOptionSchema>;
export type UpdateOptionInput = z.infer<typeof UpdateOptionSchema>;
export type CloneOptionInput = z.infer<typeof CloneOptionSchema>;
export type GetOptionQuery = z.infer<typeof GetOptionQuerySchema>;
export type CalculateOptionInput = z.infer<typeof CalculateOptionSchema>;

export type ListAlertsQuery = z.infer<typeof ListAlertsQuerySchema>;
export type CreateAlertInput = z.infer<typeof CreateAlertSchema>;
export type UpdateAlertInput = z.infer<typeof UpdateAlertSchema>;
export type GetAlertQuery = z.infer<typeof GetAlertQuerySchema>;
export type ListAlertLogsQuery = z.infer<typeof ListAlertLogsQuerySchema>;

export type ListAlertLogsGlobalQuery = z.infer<typeof ListAlertLogsGlobalQuerySchema>;
export type GetAlertLogQuery = z.infer<typeof GetAlertLogQuerySchema>;

export type InvalidateCacheInput = z.infer<typeof InvalidateCacheSchema>;

/**
 * Chart Validation Schemas
 */

export const CreateChartSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().default(""),
    visualization_config: z.record(z.any()).default({}),
    layout: z.record(z.any()).default({}),
    metadata: z.record(z.any()).default({}),
    statistic_ids: z.array(z.string()).optional(),
    view_id: z.string()
});

export const UpdateChartSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    visualization_config: z.record(z.any()).optional().nullable(),
    layout: z.record(z.any()).optional().nullable(),
    metadata: z.record(z.any()).optional().nullable(),
});

export const ManageChartStatisticsSchema = z.object({
    statistic_ids: z.array(z.string()).min(1, "At least one statistic ID is required"),
});

export const GetChartQuerySchema = ExpandSchema;

export type CreateChartInput = z.infer<typeof CreateChartSchema>;
export type UpdateChartInput = z.infer<typeof UpdateChartSchema>;
export type ManageChartStatisticsInput = z.infer<typeof ManageChartStatisticsSchema>;
export type GetChartQuery = z.infer<typeof GetChartQuerySchema>;
