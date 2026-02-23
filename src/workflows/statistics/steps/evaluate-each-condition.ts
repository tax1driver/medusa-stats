import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import type { ExtractedAlertValues } from "./extract-alert-values";

export interface EvaluateConditionsInput {
    alerts: any[];
    extracted_values: Record<string, ExtractedAlertValues>; // Keyed by alert_id
}

export interface AlertEvaluationResult {
    alert_id: string;
    triggered: boolean;
    current_value: number;
    reference_value: number | null;
    compare_value: number | [number, number]; // The actual value used for comparison
    operator: string;
    comparison_type: string;
}

export const evaluateEachConditionStep = createStep(
    "evaluate-each-condition",
    async (input: EvaluateConditionsInput, { container }) => {
        const logger = container.resolve("logger");
        const evaluationResults: AlertEvaluationResult[] = [];

        for (const alert of input.alerts) {
            const { condition } = alert;
            const extracted = input.extracted_values[alert.id];

            // Skip if no extracted values
            if (!extracted) {
                logger.warn(`[Alert ${alert.id}] No extracted values, skipping evaluation`);
                continue;
            }

            const current = extracted.current;
            let compareValue: number | [number, number];
            let triggered = false;

            // Determine what to compare against
            if (condition.comparisonType === 'absolute') {
                // Absolute comparison: compare current vs threshold
                compareValue = condition.threshold;

            } else if (condition.comparisonType === 'relative') {
                // Relative comparison: compare current vs reference value
                if (!extracted.canDoRelative || extracted.reference === null) {
                    logger.warn(
                        `[Alert ${alert.id}] Cannot perform relative comparison. ` +
                        `Skipping evaluation.`
                    );
                    continue;
                }

                const changeType = condition.changeType || 'absolute';

                if (changeType === 'percentage') {
                    // Calculate percentage change: ((current - reference) / reference) * 100
                    if (extracted.reference === 0) {
                        logger.warn(`[Alert ${alert.id}] Cannot calculate percentage change with reference value of 0`);
                        continue;
                    }
                    const percentageChange = ((current - extracted.reference) / extracted.reference) * 100;
                    // For percentage change, compare against threshold (e.g., "alert if changed by > 10%")
                    compareValue = condition.threshold || 0;

                    // Evaluate condition on percentage change
                    triggered = evaluateOperator(percentageChange, compareValue, condition.operator);

                    evaluationResults.push({
                        alert_id: alert.id,
                        triggered,
                        current_value: current,
                        reference_value: extracted.reference,
                        compare_value: percentageChange, // Store the percentage change
                        operator: condition.operator,
                        comparison_type: 'relative_percentage'
                    });
                    continue;

                } else {
                    // Absolute change: compare current directly to reference
                    compareValue = extracted.reference;
                }
            } else {
                logger.error(`[Alert ${alert.id}] Invalid comparisonType: ${condition.comparisonType}`);
                continue;
            }

            // Evaluate condition
            triggered = evaluateOperator(current, compareValue, condition.operator);

            evaluationResults.push({
                alert_id: alert.id,
                triggered,
                current_value: current,
                reference_value: extracted.reference,
                compare_value: compareValue,
                operator: condition.operator,
                comparison_type: condition.comparisonType
            });
        }

        return new StepResponse(evaluationResults);
    }
);

function evaluateOperator(value: number, compareValue: number | [number, number], operator: string): boolean {
    switch (operator) {
        case "gt":
            if (Array.isArray(compareValue)) {
                return false;
            }
            return value > compareValue;
        case "lt":
            if (Array.isArray(compareValue)) {
                return false;
            }
            return value < compareValue;
        case "gte":
            if (Array.isArray(compareValue)) {
                return false;
            }
            return value >= compareValue;
        case "lte":
            if (Array.isArray(compareValue)) {
                return false;
            }
            return value <= compareValue;
        case "eq":
            if (Array.isArray(compareValue)) {
                return false;
            }
            return value === compareValue;
        case "neq":
            if (Array.isArray(compareValue)) {
                return false;
            }
            return value !== compareValue;
        case "between":
            if (!Array.isArray(compareValue) || compareValue.length !== 2) {
                return false;
            }
            return value >= compareValue[0] && value <= compareValue[1];
        default:
            return false;
    }
}
