import { createWorkflow, WorkflowResponse, transform, when } from "@medusajs/framework/workflows-sdk";
import { fetchActiveAlertsForOptionStep } from "./steps/fetch-active-alerts-for-option";
import { extractAlertValuesStep } from "./steps/extract-alert-values";
import { evaluateEachConditionStep } from "./steps/evaluate-each-condition";
import { dedupeAlertsStep } from "./steps/dedupe-alerts";
import { createAlertLogEntriesStep } from "./steps/create-alert-log-entries";
import { emitAlertEventsStep } from "./steps/emit-alert-events";

export interface EvaluateAlertsInput {
    option_id: string;
    calculated_value: any; // The result from calculateStatistic
    evaluation_scope?: {
        periodStart?: Date;
        periodEnd?: Date;
        interval?: number;
    };
}

/**
 * Workflow: Evaluate Alerts After Calculation
 * 
 * Purpose: Check alert conditions after statistic calculation and trigger notifications
 * 
 * Steps:
 * - fetch-active-alerts-for-option - Get all enabled alerts for calculated option
 * - extract-alert-values - Extract current and reference values from calculated result
 * - evaluate-each-condition - Check if alert conditions are met
 * - check-cooldown-period - Verify alert hasn't fired recently (rate limiting)
 * - emit-alert-triggered-events - Emit events for each triggered alert
 * - create-alert-log-entries - Record alert triggers and delivery status
 */
export const evaluateAlertsWorkflow = createWorkflow(
    "evaluate-alerts",
    (input: EvaluateAlertsInput) => {
        // Step 1: Fetch all active alerts for this option
        const alerts = fetchActiveAlertsForOptionStep({ option_id: input.option_id });

        // Early return if no alerts
        const shouldContinue = transform({ alerts }, (data) => {
            return data.alerts && data.alerts.length > 0;
        });

        // Step 2: Extract current and reference values from calculated result
        const current_values = transform({ input }, (data) => {
            return { [data.input.option_id]: data.input.calculated_value };
        });

        const extracted_values = extractAlertValuesStep({
            alerts,
            current_values
        });

        // Step 3: Evaluate each condition
        const evaluation_results = evaluateEachConditionStep({
            alerts,
            extracted_values
        });

        // Step 4: Check cooldown period and rate limits
        const allowed_alerts = dedupeAlertsStep({
            alerts,
            evaluation_results,
            evaluation_scope: input.evaluation_scope,
        });

        // Step 5: Emit events for each triggered alert
        // Subscribers will handle notification preparation and sending
        const emitted_event_ids = emitAlertEventsStep({
            alerts,
            evaluation_results,
            allowed_alerts,
            extracted_values
        });

        // Step 6: Create alert log entries
        const alert_logs = createAlertLogEntriesStep({
            alerts,
            evaluation_results,
            allowed_alerts,
            extracted_values
        });

        const summary = transform({ alerts, allowed_alerts, alert_logs, emitted_event_ids }, (data) => {
            return {
                alerts_evaluated: data.alerts?.length || 0,
                alerts_triggered: data.allowed_alerts?.length || 0,
                alert_logs: data.alert_logs,
                events_emitted: data.emitted_event_ids?.length || 0
            };
        });

        return new WorkflowResponse(summary);
    }
);
