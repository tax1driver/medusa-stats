import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { STATISTICS_MODULE } from "../../../modules/statistics";
import StatisticsService from "../../../modules/statistics/service";

export interface FetchActiveAlertsInput {
    option_id: string;
}

export const fetchActiveAlertsForOptionStep = createStep(
    "fetch-active-alerts-for-option",
    async (input: FetchActiveAlertsInput, { container }) => {
        const statisticsService = container.resolve<StatisticsService>(STATISTICS_MODULE);

        const alerts = await statisticsService.listStatisticsAlerts(
            {
                option_id: input.option_id,
                is_enabled: true
            },
            {
                relations: ["option", "option.provider"]
            }
        );

        return new StepResponse(alerts);
    }
);
