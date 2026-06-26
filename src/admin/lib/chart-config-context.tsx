import { createContext, useContext, type ReactNode } from "react"
import type { SeriesVisualizationConfig } from "../lib/statistics/api"

type ChartConfigContextValue = {
    config: SeriesVisualizationConfig
    onChange: (patch: Partial<SeriesVisualizationConfig>) => void
}

const ChartConfigContext = createContext<ChartConfigContextValue | null>(null)

export const ChartConfigProvider = ({
    config,
    onChange,
    children,
}: ChartConfigContextValue & { children: ReactNode }) => {
    return (
        <ChartConfigContext.Provider value={{ config, onChange }}>
            {children}
        </ChartConfigContext.Provider>
    )
}

export const useChartConfig = (): ChartConfigContextValue => {
    const ctx = useContext(ChartConfigContext)
    if (!ctx) {
        throw new Error(
            "useChartConfig must be used within a ChartConfigProvider",
        )
    }
    return ctx
}
