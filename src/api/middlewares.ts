import {
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import {
  ListProvidersQuerySchema,
  GetProviderQuerySchema,
  GetProviderStatisticsQuerySchema,
  ListViewsQuerySchema,
  CreateViewSchema,
  UpdateViewSchema,
  GetViewQuerySchema,
  CalculateViewSchema,
  CloneViewSchema,
  ListChartsQuerySchema,
  ListOptionsQuerySchema,
  CreateOptionSchema,
  UpdateOptionSchema,
  CloneOptionSchema,
  GetOptionQuerySchema,
  CalculateOptionSchema,
  ListAlertsQuerySchema,
  CreateAlertSchema,
  UpdateAlertSchema,
  GetAlertQuerySchema,
  ListAlertLogsQuerySchema,
  ListAlertLogsGlobalQuerySchema,
  GetAlertLogQuerySchema,
  CreateChartSchema,
  UpdateChartSchema,
  ManageChartStatisticsSchema,
  GetChartQuerySchema,
} from "./validation/statistics/schemas"

export default defineMiddlewares({
  routes: [





    {
      matcher: "/admin/statistics/providers",
      method: "GET",
      middlewares: [validateAndTransformQuery(ListProvidersQuerySchema, {
        defaults: ["id", "is_enabled"],
        isList: true
      })],
    },
    {
      matcher: "/admin/statistics/providers/:id",
      method: "GET",
      middlewares: [validateAndTransformQuery(GetProviderQuerySchema, {
        defaults: ["id", "is_enabled", "created_at", "updated_at"]
      })],
    },
    {
      matcher: "/admin/statistics/providers/:id/statistics",
      method: "GET",
      middlewares: [validateAndTransformQuery(GetProviderStatisticsQuerySchema, {
        defaults: ["id", "name", "description", "category", "display"]
      })],
    },


    {
      matcher: "/admin/statistics/views",
      method: "GET",
      middlewares: [validateAndTransformQuery(ListViewsQuerySchema, {
        defaults: ["id", "name", "description", "layout_config", "created_at", "updated_at"],
        isList: true
      })],
    },
    {
      matcher: "/admin/statistics/views",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateViewSchema)],
    },
    {
      matcher: "/admin/statistics/views/:id",
      method: "GET",
      middlewares: [validateAndTransformQuery(GetViewQuerySchema, {
        defaults: ["id", "name", "description", "stats_data", "layout_config", "cache_options", "period_type", "period_config", "interval", "created_at", "updated_at", "*charts", "charts.statistics.*", "charts.statistics.input_dependencies.*", "charts.statistics.input_dependencies.input_option.*"]
      })],
    },
    {
      matcher: "/admin/statistics/views/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateViewSchema)],
    },
    {
      matcher: "/admin/statistics/views/:id/calculate",
      method: "POST",
      middlewares: [validateAndTransformBody(CalculateViewSchema)],
    },
    {
      matcher: "/admin/statistics/views/:id/clone",
      method: "POST",
      middlewares: [validateAndTransformBody(CloneViewSchema)],
    },
    {
      matcher: "/admin/statistics/views/:id/charts",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateChartSchema)],
    },


    {
      matcher: "/admin/statistics/charts/:id",
      method: "GET",
      middlewares: [validateAndTransformQuery(GetChartQuerySchema, {
        defaults: ["id", "name", "description", "visualization_config", "layout", "created_at", "updated_at"]
      })],
    },
    {
      matcher: "/admin/statistics/charts",
      method: "GET",
      middlewares: [validateAndTransformQuery(ListChartsQuerySchema, {
        defaults: ["id", "name", "description", "visualization_config", "layout", "created_at", "updated_at", "view.*", "statistics.*"],
        isList: true
      })],
    },
    {
      matcher: "/admin/statistics/charts",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateChartSchema)],
    },
    {
      matcher: "/admin/statistics/charts/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateChartSchema)],
    },
    {
      matcher: "/admin/statistics/charts/:id",
      method: "DELETE",
      middlewares: [],
    },
    {
      matcher: "/admin/statistics/charts/:id/statistics",
      method: "PUT",
      middlewares: [validateAndTransformBody(ManageChartStatisticsSchema)],
    },
    {
      matcher: "/admin/statistics/charts/:id/statistics",
      method: "DELETE",
      middlewares: [validateAndTransformBody(ManageChartStatisticsSchema)],
    },


    {
      matcher: "/admin/statistics/options",
      method: "GET",
      middlewares: [validateAndTransformQuery(ListOptionsQuerySchema, {
        defaults: ["id", "provider_option_name", "local_option_name", "created_at", "updated_at"],
        isList: true
      })],
    },
    {
      matcher: "/admin/statistics/options",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateOptionSchema)],
    },
    {
      matcher: "/admin/statistics/options/:id",
      method: "GET",
      middlewares: [validateAndTransformQuery(GetOptionQuerySchema, {
        defaults: ["id", "provider_option_name", "local_option_name", "data", "created_at", "updated_at", "*provider", "*input_dependencies"]
      })],
    },
    {
      matcher: "/admin/statistics/options/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateOptionSchema)],
    },
    {
      matcher: "/admin/statistics/options/:id/calculate",
      method: "POST",
      middlewares: [validateAndTransformBody(CalculateOptionSchema)],
    },

    {
      matcher: "/admin/statistics/options/:id/clone",
      method: "POST",
      middlewares: [validateAndTransformBody(CloneOptionSchema)],
    },

    {
      matcher: "/admin/statistics/alerts",
      method: "GET",
      middlewares: [validateAndTransformQuery(ListAlertsQuerySchema, {
        defaults: ["id", "name", "severity", "is_enabled", "created_at", "updated_at", "*option", "*option.provider"],
        isList: true
      })],
    },
    {
      matcher: "/admin/statistics/alerts",
      method: "POST",
      middlewares: [validateAndTransformBody(CreateAlertSchema)],
    },
    {
      matcher: "/admin/statistics/alerts/:id",
      method: "GET",
      middlewares: [validateAndTransformQuery(GetAlertQuerySchema, {
        defaults: ["id", "name", "description", "condition", "period", "interval", "severity", "metadata", "is_enabled", "created_at", "updated_at"]
      })],
    },
    {
      matcher: "/admin/statistics/alerts/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(UpdateAlertSchema)],
    },
    {
      matcher: "/admin/statistics/alerts/:id/logs",
      method: "GET",
      middlewares: [validateAndTransformQuery(ListAlertLogsQuerySchema, {
        defaults: ["id", "alert_id", "triggered_at", "evaluation_data", "evaluation_hash", "metadata", "created_at"],
        isList: true
      })],
    },


    {
      matcher: "/admin/statistics/alert-logs",
      method: "GET",
      middlewares: [validateAndTransformQuery(ListAlertLogsGlobalQuerySchema, {
        defaults: ["id", "alert_id", "triggered_at", "evaluation_data", "evaluation_hash", "metadata", "created_at", "*alert"],
        isList: true
      })],
    },
    {
      matcher: "/admin/statistics/alert-logs/:id",
      method: "GET",
      middlewares: [validateAndTransformQuery(GetAlertLogQuerySchema, {
        defaults: ["id", "alert_id", "triggered_at", "evaluation_data", "evaluation_hash", "metadata", "created_at", "*alert"]
      })],
    },
  ],
})
