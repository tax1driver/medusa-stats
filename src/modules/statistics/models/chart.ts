import { model } from "@medusajs/framework/utils";
import { StatisticsView } from "./view";
import { StatisticsOption } from "./option";

/**
 * Represents a chart visualization that can contain multiple StatisticOptions.
 * Supports combo charts where each option can have its own chart type (line, bar, area, etc.)
 * 
 * StatisticsChart handles chart-wide settings (axes, legend, grid)
 * StatisticsOption handles per-series settings (colors, line styles, chart type)
 */
export const StatisticsChart = model.define("statistics_chart", {
    id: model.id({ prefix: "stat_chart" }).primaryKey(),

    // Chart identification
    name: model.text(),
    description: model.text().nullable(),

    // Chart-wide visualization configuration
    // Controls the overall chart container and shared elements
    visualization_config: model.json().nullable(), // {
    //   showLegend: boolean,
    //   legendPosition: "top" | "bottom" | "left" | "right",
    //   xAxis: { label, format, min, max },
    //   yAxis: { label, scaleType, min, max, format },
    //   showGrid: boolean,
    //   gridStyle: { color, dashArray },
    //   showTooltip: boolean,
    //   tooltipFormat: string,
    //   backgroundColor: string,
    //   fontFamily: string
    // }

    // Layout configuration (for dashboard positioning)
    layout: model.json().nullable(), // { width, height, position }

    // Relationships
    view: model.belongsTo(() => StatisticsView, {
        mappedBy: "charts"
    }),

    // Many-to-many with statistics options
    // Each option defines its own chart type and styling
    statistics: model.manyToMany(() => StatisticsOption, {
        mappedBy: "charts",
    }),

    // Additional metadata
    metadata: model.json().default({})
})
