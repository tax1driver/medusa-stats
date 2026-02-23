import { Module } from "@medusajs/framework/utils";
import StatisticsService from "./service";
import StatisticsLoader from "../../loaders/statistics";

export const STATISTICS_MODULE = "statistics";

const StatisticsModule = Module(STATISTICS_MODULE, {
    service: StatisticsService,
    loaders: [StatisticsLoader]
})

export default StatisticsModule;
export * from "./providers";
export * from "./models";
