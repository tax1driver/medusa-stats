import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { createAlertStep } from "./steps/create-alert";
import { validateAlertInputStep } from "./steps/validate-alert-input";

export interface CreateAlertInput {
    name: string;
    description?: string;
    option_id: string;
    condition: {
        operator: "lt" | "gt" | "lte" | "gte" | "eq" | "neq" | "between";
        comparisonType: "absolute" | "relative";
        threshold?: number | [number, number];
        lookbackPositions?: number;
        changeType?: "absolute" | "percentage";
    };
    period?: {
        type: "calendar" | "custom";
        config:
        | { reference: "today" | "yesterday" | "wtd" | "lastweek" | "mtd" | "lastmonth" | "qtd" | "lastquarter" | "ytd" | "lastyear" }
        | { start: string | Date; end: string | Date };
    };
    interval?: number;
    severity: "info" | "warning" | "critical";
    is_enabled?: boolean;
    metadata?: {
        cooldown_period?: number;
        max_alerts_per_day?: number;
        custom_message?: string;
        recipients?: string[];
    };
}

export const createAlertWorkflow = createWorkflow(
    "create-alert",
    (input: CreateAlertInput) => {

        const validated = validateAlertInputStep(input);


        const alert = createAlertStep(validated);

        return new WorkflowResponse(alert);
    }
);
