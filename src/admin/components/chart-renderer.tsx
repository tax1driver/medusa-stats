import type { ReactNode } from "react"
import type { LegendPayload } from "recharts"
// import { LayoutComposer } from "@medusajs/dashboard/components"
import { RechartChart } from "./rechart-chart"
import { AggregateView } from "./aggregate-view"
import { ListView } from "./list-view"



export type ChartDataPoint = {
    x: string | number
    [key: string]: any
}

export type SeriesConfig = {
    key: string
    name: string
    chartType?: string
    color?: string
    visible?: boolean
    extra?: Record<string, any>
}

export type ChartRendererConfig = {
    showLegend?: boolean
    showGrid?: boolean
    showTooltip?: boolean
    xAxis?: { label?: string }
    yAxis?: { label?: string }
    extra?: Record<string, any>
}

export type ChartRendererProps = {
    data: ChartDataPoint[]
    series: SeriesConfig[]
    config?: ChartRendererConfig | null
    interval: number
    renderLegend?: (props: { payload?: readonly LegendPayload[] }) => ReactNode
}



function renderBuiltIn(props: ChartRendererProps) {
    const type = props.series[0]?.chartType || "3d";

    if (type === "aggregate") return <AggregateView {...props} />
    if (type === "list") return <ListView {...props} />
    else if (type === "3d") return <RechartChart {...props} />
    else return <div></div>;
}

export const ChartRenderer = (props: ChartRendererProps) => {
    return renderBuiltIn(props)

    // TODO: re-enable LayoutComposer for widget-based custom renderers
    // return (
    //     <LayoutComposer
    //         widgetsZonePrefix="statistics.chart"
    //         preferredLayoutId="core:single-column"
    //         data={props}
    //         sections={{
    //             main: renderBuiltIn(props),
    //         }}
    //     />
    // )
}
