import { sdk } from "../sdk"

// Types
export type StatisticsProvider = {
    id: string
    is_enabled: boolean
    display_name?: string
    created_at: string
    updated_at: string
}

// Per-series visualization configuration (on StatisticsOption)
// Controls how a specific data series renders within a chart
export type SeriesVisualizationConfig = {
    chartType?: "line" | "bar" | "area" | "pie"
    color?: string
    lineStyle?: "solid" | "dashed" | "dotted"
    lineWidth?: number
    showMarkers?: boolean
    markerSize?: number
    barWidth?: number
    fillOpacity?: number
    visible?: boolean
    label?: string
    [key: string]: any
}

// Chart-wide visualization configuration (on StatisticsChart)
// Controls the overall chart container and shared elements
export type ChartVisualizationConfig = {
    showLegend?: boolean
    legendPosition?: "top" | "bottom" | "left" | "right"
    xAxis?: {
        label?: string
        format?: string
        min?: number
        max?: number
    }
    yAxis?: {
        label?: string
        scaleType?: "linear" | "log"
        min?: number
        max?: number
        format?: string
    }
    showGrid?: boolean
    gridStyle?: {
        color?: string
        dashArray?: string
    }
    showTooltip?: boolean
    tooltipFormat?: string
    backgroundColor?: string
    fontFamily?: string
    [key: string]: any
}

export type ChartLayout = {
    width?: number
    height?: number
    position?: { x: number; y: number }
    [key: string]: any
}

export type StatisticsChart = {
    id: string
    name: string
    description: string | null
    visualization_config: ChartVisualizationConfig | null
    layout: ChartLayout | null
    view_id: string
    metadata: Record<string, any>
    created_at: string
    updated_at: string
    view?: StatisticsView
    statistics?: StatisticsOption[]
}

export type StatisticsView = {
    id: string
    name: string
    description: string | null
    stats_data: Record<string, any> | null
    layout_config: Record<string, any> | null
    period_type: 'rolling' | 'calendar' | 'custom' | null
    period_config: Record<string, any> | null
    interval: number | null
    cache_options: { enabled?: boolean; ttl?: number } | null
    metadata: Record<string, any> | null
    created_at: string
    updated_at: string
    statistics?: StatisticsOption[]
    charts?: StatisticsChart[]
}

export type StatisticsOption = {
    id: string
    provider_option_name: string
    local_option_name: string
    data: Record<string, any>
    visualization_config: SeriesVisualizationConfig | null
    cache_options: { enabled?: boolean; ttl?: number } | null
    // Composite Statistics fields
    parameter_config: Record<string, { value: any; locked: boolean }> | null
    preset: boolean
    created_at: string
    updated_at: string
    provider_id: string
    view_id: string
    provider?: StatisticsProvider
    view?: StatisticsView
    charts?: StatisticsChart[]
    // Composite Statistics relationships
    input_dependencies?: InputDependency[]
    dependent_composites?: StatisticsOption[]
}

export type InputDependency = {
    id: string
    composite_option_id: string
    input_option_id: string
    parameter_name: string | null
    order: number | null
    metadata: Record<string, any> | null
    input_option?: StatisticsOption
}

export type DependencyNode = {
    id: string
    name: string
    provider_option_name: string
    parameter_name?: string
    depth: number
    dependencies: DependencyNode[]
}


export type StatisticsAlert = {
    id: string
    name: string
    description: string | null
    option_id: string
    condition: Record<string, any>
    period: Record<string, any> | null
    interval: number
    severity: "info" | "warning" | "critical"
    is_enabled: boolean
    metadata: Record<string, any> | null
    created_at: string
    updated_at: string
    option?: StatisticsOption
}

export type StatisticsAlertLog = {
    id: string
    alert_id: string
    triggered_at: string
    evaluation_data: Record<string, any>
    evaluation_hash: string
    metadata: Record<string, any> | null
    created_at: string
    updated_at: string
    alert?: StatisticsAlert
}

export type ParameterFieldType =
    | "text"
    | "number"
    | "select"
    | "multiselect"
    | "boolean"
    | "date"
    | "daterange"
    | "currency"
    | "json"
    | "entity"      // Single entity reference
    | "entities"    // Multiple entity references
    | "stat"        // Reference to input dependencies
    | "custom"

export type EntityReference = {
    entity: string  // Entity type (e.g., "customer", "product", "sales_channel")
}

export type ParameterFieldDefinition = {
    name: string
    label: string
    description?: string
    placeholder?: string
    fieldType: ParameterFieldType
    // For select/multiselect fields
    options?: Array<{
        value: string | number | boolean
        label: string
        description?: string
        disabled?: boolean
    }>
    // For entity reference fields
    entityReference?: EntityReference
    // Relations and dependencies
    dependsOn?: Array<{
        field: string
        condition?: (value: any, allValues: Record<string, any>) => boolean
        effect?: "show" | "hide" | "enable" | "disable" | "require"
    }>
}

export type AvailableStatistic = {
    id: string
    name: string
    description?: string
    category?: string
    tags?: string[]
    parameters: {
        fields: ParameterFieldDefinition[]
        defaults?: Record<string, any>
    }
    display: {
        type: "currency" | "number" | "percentage" | "count" | "duration" | "text" | "custom"
        format?: {
            currency?: string               // ISO currency code (USD, EUR, etc.)
            decimals?: number               // Number of decimal places
            prefix?: string                 // Display prefix (e.g., "#", "+")
            suffix?: string                 // Display suffix (e.g., "/month", "orders")
            locale?: string                 // Locale for number formatting (en-US, de-DE)
            notation?: "standard" | "compact" | "scientific" | "engineering"
        }
        visualization?: {
            preferredChartType?: "line" | "bar" | "area" | "pie" | "gauge" | "number"
            xAxisType?: "time" | "category"
            icon?: string                   // Icon identifier
        }
    }
    metadata?: Record<string, any>
}

export type StatisticResult = {
    value: any                          // The calculated value (number, string, object)
    metadata?: Record<string, any>;
}

// Query parameters
export type PaginationParams = {
    offset?: number
    limit?: number
}

export type ViewQueryParams = PaginationParams & {
    q?: string
    order?: string
}

export type OptionQueryParams = PaginationParams & {
    view_id?: string
    provider_id?: string
    preset?: boolean
    q?: string
    order?: string
}

export type AlertQueryParams = PaginationParams & {
    option_id?: string
    severity?: string
    is_enabled?: boolean
    q?: string
    order?: string
}

// ===== VIEWS API =====

export const listViews = async (params?: ViewQueryParams) => {
    const response = await sdk.client.fetch<{ views: StatisticsView[]; count: number }>("/admin/statistics/views", {
        query: params
    })
    return {
        views: response.views,
        count: response.count || response.views.length,
    }
}

export const getView = async (id: string): Promise<StatisticsView> => {
    const response = await sdk.client.fetch<{ view: StatisticsView }>(`/admin/statistics/views/${id}`)
    return response.view
}

export const createView = async (data: {
    name: string
    description?: string
    stats_data?: Record<string, any>
    layout_config?: Record<string, any>
    options?: Array<{
        provider_id: string
        statistic_key: string
        data?: Record<string, any>
    }>
}): Promise<{ view: StatisticsView; options: StatisticsOption[] }> => {
    const response = await sdk.client.fetch<{ view: StatisticsView; options: StatisticsOption[] }>("/admin/statistics/views", {
        method: "POST",
        body: data,
    })
    return response
}

export const updateView = async (id: string, data: {
    name?: string
    description?: string
    stats_data?: Record<string, any>
    layout_config?: Record<string, any> | null
    period_type?: 'rolling' | 'calendar' | 'custom'
    period_config?: Record<string, any>
    interval?: number
    cache_options?: { enabled?: boolean; ttl?: number } | null
}): Promise<{ view: StatisticsView }> => {
    const response = await sdk.client.fetch<{ view: StatisticsView }>(`/admin/statistics/views/${id}`, {
        method: "POST",
        body: data,
    })
    return response
}

export const deleteView = async (id: string): Promise<void> => {
    await sdk.client.fetch(`/admin/statistics/views/${id}`, {
        method: "DELETE",
    })
}

export const calculateView = async (id: string, data: {
    periodStart: string
    periodEnd: string
    interval?: number
}): Promise<any> => {
    const response = await sdk.client.fetch(`/admin/statistics/views/${id}/calculate`, {
        method: "POST",
        body: data,
    })
    return response
}

export const cloneView = async (id: string, data: {
    new_name: string
    include_options?: boolean
}): Promise<{ view: StatisticsView; options: StatisticsOption[] }> => {
    const response = await sdk.client.fetch<{ view: StatisticsView; options: StatisticsOption[] }>(`/admin/statistics/views/${id}/clone`, {
        method: "POST",
        body: data,
    })
    return response
}

// ===== OPTIONS API =====

export const listOptions = async (params?: OptionQueryParams) => {
    const response = await sdk.client.fetch<{ options: StatisticsOption[]; count: number }>("/admin/statistics/options", {
        query: params
    })
    return {
        options: response.options,
        count: response.count || response.options.length,
    }
}

export const getOption = async (id: string): Promise<StatisticsOption> => {
    const response = await sdk.client.fetch<{ option: StatisticsOption }>(`/admin/statistics/options/${id}`)
    return response.option
}

export const calculateOption = async (id: string, data: {
    periodStart: string
    periodEnd: string
    interval?: number
    runtimeParameters?: Record<string, any>
}): Promise<any> => {
    const response = await sdk.client.fetch(`/admin/statistics/options/${id}/calculate`, {
        method: "POST",
        body: data,
    })
    return response
}

export const createOption = async (data: {
    view_id?: string
    provider_id: string
    provider_option_name: string
    data?: Record<string, any>
    local_option_name?: string
    preset?: boolean
}): Promise<StatisticsOption> => {
    const response = await sdk.client.fetch<{ option: StatisticsOption }>(`/admin/statistics/options`, {
        method: "POST",
        body: data,
        query: { fields: "*provider,*view" }
    })
    return response.option
}

export const updateOption = async (id: string, data: {
    data?: Record<string, any>
    local_option_name?: string
    visualization_config?: SeriesVisualizationConfig | null
    cache_options?: { enabled?: boolean; ttl?: number } | null
    input_dependencies?: InputDependency[]
    view_id?: string
}): Promise<StatisticsOption> => {
    const response = await sdk.client.fetch<{ option: StatisticsOption }>(`/admin/statistics/options/${id}`, {
        method: "POST",
        body: data,
        query: { fields: "*provider,*view" }
    })
    return response.option
}

// ===== CHARTS API =====

export const listCharts = async (params?: { view_id?: string; limit?: number; offset?: number }) => {
    const response = await sdk.client.fetch<{ charts: StatisticsChart[]; count: number }>("/admin/statistics/charts", {
        query: params
    })
    return {
        charts: response.charts,
        count: response.count || response.charts.length,
    }
}

export const getChart = async (id: string): Promise<StatisticsChart> => {
    const response = await sdk.client.fetch<{ chart: StatisticsChart }>(`/admin/statistics/charts/${id}`, {
        query: { fields: "*view,*statistics" }
    })
    return response.chart
}

export const createChart = async (data: {
    view_id: string
    name: string
    description?: string
    visualization_config?: ChartVisualizationConfig
    layout?: ChartLayout
    statistic_ids?: string[]
}): Promise<StatisticsChart> => {
    const response = await sdk.client.fetch<{ chart: StatisticsChart }>("/admin/statistics/charts", {
        method: "POST",
        body: data,
        query: { fields: "*view,*statistics" }
    })
    return response.chart
}

export const updateChart = async (id: string, data: {
    name?: string
    description?: string
    visualization_config?: ChartVisualizationConfig
    layout?: ChartLayout
    statistic_ids?: string[]
}): Promise<StatisticsChart> => {
    const response = await sdk.client.fetch<{ chart: StatisticsChart }>(`/admin/statistics/charts/${id}`, {
        method: "POST",
        body: data,
        query: { fields: "*view,*statistics" }
    })
    return response.chart
}

export const deleteChart = async (id: string): Promise<void> => {
    await sdk.client.fetch(`/admin/statistics/charts/${id}`, {
        method: "DELETE",
    })
}

export const addStatisticsToChart = async (chartId: string, statisticIds: string[]): Promise<StatisticsChart> => {
    const response = await sdk.client.fetch<{ chart: StatisticsChart }>(`/admin/statistics/charts/${chartId}/statistics`, {
        method: "PUT",
        body: { statistic_ids: statisticIds },
        query: { fields: "*view,*statistics" }
    })
    return response.chart
}

export const removeStatisticFromChart = async (chartId: string, statisticId: string): Promise<StatisticsChart> => {
    const response = await sdk.client.fetch<{ chart: StatisticsChart }>(`/admin/statistics/charts/${chartId}/statistics`, {
        method: "DELETE",
        body: { statistic_ids: [statisticId] },
        query: { fields: "*view,*statistics" }
    })
    return response.chart
}

// ===== PROVIDERS API =====

export const listProviders = async (params?: {
    is_enabled?: boolean
    q?: string
    order?: string
    limit?: number
    offset?: number
}) => {
    const response = await sdk.client.fetch<{ providers: StatisticsProvider[]; count?: number }>("/admin/statistics/providers", {
        query: params
    })
    return {
        providers: response.providers,
        count: response.count || response.providers.length,
    }
}

export const getProvider = async (id: string): Promise<StatisticsProvider> => {
    const response = await sdk.client.fetch<{ provider: StatisticsProvider }>(`/admin/statistics/providers/${id}`)
    return response.provider
}

export const getProviderStatistics = async (id: string, params?: { sales_channel_id?: string }): Promise<{ statistics: AvailableStatistic[] }> => {
    const response = await sdk.client.fetch<{ statistics: AvailableStatistic[] }>(`/admin/statistics/providers/${id}/statistics`, {
        query: {
            ...params,
        },
    })
    return response
}

export const getAllProviderStatistics = async (params?: { provider_id?: string; sales_channel_id?: string }): Promise<{ statistics: (AvailableStatistic & { provider_id: string; provider_name: string })[] }> => {
    const response = await sdk.client.fetch<{ statistics: (AvailableStatistic & { provider_id: string; provider: StatisticsProvider })[] }>(`/admin/statistics/providers/${params?.provider_id || "all"}/statistics`, {
        query: params ? { sales_channel_id: params.sales_channel_id } : undefined
    })
    return response
}

// ===== ALERTS API =====

export const listAlerts = async (params?: AlertQueryParams) => {
    const response = await sdk.client.fetch<{ alerts: StatisticsAlert[]; count: number }>("/admin/statistics/alerts", {
        query: params
    })
    return {
        alerts: response.alerts,
        count: response.count || response.alerts.length,
    }
}

export const getAlert = async (id: string): Promise<StatisticsAlert> => {
    const response = await sdk.client.fetch<{ alert: StatisticsAlert }>(`/admin/statistics/alerts/${id}`, {
        query: { fields: "*option" }
    })
    return response.alert
}

export const createAlert = async (data: {
    name: string
    description?: string
    option_id: string
    condition: {
        operator: string
        threshold: number | [number, number]
        comparisonType: string
        changeType?: string
        lookbackPositions?: number
    }
    interval: number
    severity: string
    metadata?: Record<string, any>
    is_enabled?: boolean
    user_ids?: string[]
}): Promise<StatisticsAlert> => {
    const response = await sdk.client.fetch<StatisticsAlert>("/admin/statistics/alerts", {
        method: "POST",
        body: data,
    })
    return response
}

export const updateAlert = async (id: string, data: Partial<{
    name: string
    description: string
    condition: Record<string, any>
    severity: string
    interval: number
    metadata: Record<string, any>
    is_enabled: boolean
}>): Promise<StatisticsAlert> => {
    const response = await sdk.client.fetch<{ alert: StatisticsAlert }>(`/admin/statistics/alerts/${id}`, {
        method: "POST",
        body: data,
    })
    return response.alert
}

export const deleteAlert = async (id: string): Promise<void> => {
    await sdk.client.fetch(`/admin/statistics/alerts/${id}`, {
        method: "DELETE",
    })
}

export const toggleAlert = async (id: string, is_enabled: boolean): Promise<StatisticsAlert> => {
    const response = await sdk.client.fetch<{ alert: StatisticsAlert }>(`/admin/statistics/alerts/${id}/toggle`, {
        method: "POST",
        body: { is_enabled },
    })
    return response.alert
}

// ===== ALERT LOGS API =====

export type AlertLogQueryParams = PaginationParams & {
    alert_id?: string
    severity?: "info" | "warning" | "critical"
    q?: string
    order?: string
}

export const listAlertLogs = async (params?: AlertLogQueryParams) => {
    const response = await sdk.client.fetch<{ logs: StatisticsAlertLog[]; count: number }>("/admin/statistics/alert-logs", {
        query: params
    })
    return {
        logs: response.logs,
        count: response.count || response.logs.length,
    }
}

export const getAlertLog = async (id: string) => {
    const response = await sdk.client.fetch<{ log: StatisticsAlertLog }>(`/admin/statistics/alert-logs/${id}`)
    return response.log
}

// ============================================================================
// Composite Statistics API Functions
// ============================================================================

/**
 * Clone a statistics option with customizations
 */
export const cloneOption = async (
    sourceId: string,
    data: {
        local_option_name?: string
        parameter_config?: Record<string, { value: any; locked: boolean }>
        preset?: boolean
    }
): Promise<StatisticsOption> => {
    const response = await sdk.client.fetch<{ option: StatisticsOption }>(
        `/admin/statistics/options/${sourceId}/clone`,
        {
            method: "POST",
            body: data,
        }
    )
    return response.option
}

/**
 * Update a statistics option (including composite fields)
 */
export const updateOptionWithCompositeFields = async (
    id: string,
    data: Partial<{
        local_option_name: string
        data: Record<string, any>
        visualization_config: SeriesVisualizationConfig
        cache_options: { enabled?: boolean; ttl?: number }
        parameter_config: Record<string, { value: any; locked: boolean }>
        preset: boolean
        input_dependencies: Array<{
            input_option_id: string
            parameter_name: string
            order?: number
        }>
    }>
): Promise<StatisticsOption> => {
    const response = await sdk.client.fetch<{ option: StatisticsOption }>(
        `/admin/statistics/options/${id}`,
        {
            method: "POST",
            body: data,
        }
    )
    return response.option
}
