import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";

export interface CreateAlertInput {
    name: string;
    description?: string;
    option_id: string;
    condition: any;
    period?: any;
    interval?: number;
    severity: "info" | "warning" | "critical";
    is_enabled?: boolean;
    metadata?: Record<string, any>;
}

export const createAlertStep = createStep(
    "create-alert",
    async (input: CreateAlertInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);


        const alertData = {
            ...input,
            interval: input.interval || 86400,
            condition: input.condition as any,
        };

        const alert = await statisticsService.createStatisticsAlerts(alertData);

        return new StepResponse(alert, alert.id);
    },
    async (alertId, { container }) => {
        if (!alertId) return;

        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);
        await statisticsService.deleteStatisticsAlerts(alertId);
    }
);
