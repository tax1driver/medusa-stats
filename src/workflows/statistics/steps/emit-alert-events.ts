import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { Modules } from "@medusajs/framework/utils";
import type { ExtractedAlertValues } from "./extract-alert-values";
import type { AllowedAlertEvaluation } from "./dedupe-alerts";

export interface EmitAlertEventsInput {
    alerts: any[];
    evaluation_results: Array<{
        alert_id: string;
        triggered: boolean;
        current_value: number;
        reference_value: number | null;
        compare_value: number | [number, number];
        operator: string;
        comparison_type: string;
    }>;
    allowed_alerts: AllowedAlertEvaluation[];
    extracted_values: Record<string, ExtractedAlertValues>;
}

export const emitAlertEventsStep = createStep(
    "emit-alert-events",
    async (input: EmitAlertEventsInput, { container }) => {
        const eventBus = container.resolve(Modules.EVENT_BUS);
        const emittedEventIds: string[] = [];

        for (const allowed of input.allowed_alerts) {
            const alert_id = allowed.alert_id;
            const alert = input.alerts.find(a => a.id === alert_id);
            const evaluation = input.evaluation_results.find(e => e.alert_id === alert_id);
            const extracted = input.extracted_values[alert_id];

            if (!alert || !evaluation || !extracted) {
                continue;
            }

            const channels = Array.isArray(alert.metadata?.channels)
                ? alert.metadata.channels
                : [];

            await eventBus.emit([
                {
                    name: "statistics.alert",
                    data: {
                        alert_id: alert.id,
                        alert_name: alert.name,
                        severity: alert.severity,
                        option_id: alert.option_id,
                        option_name: alert.option?.local_option_name,
                        current_value: evaluation.current_value,
                        reference_value: evaluation.reference_value,
                        compare_value: evaluation.compare_value,
                        operator: evaluation.operator,
                        comparison_type: evaluation.comparison_type,
                    }
                }
            ]);

            emittedEventIds.push(alert_id);
        }

        return new StepResponse(emittedEventIds);
    }
);
