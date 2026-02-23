import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";

export interface ExtractAlertValuesInput {
    alerts: any[];
    current_values: Record<string, any>; // Keyed by option_id
}

export interface ExtractedAlertValues {
    alert_id: string;
    current: number;
    reference: number | null;
    valueType: 'timeseries' | 'single';
    canDoRelative: boolean;
}

export const extractAlertValuesStep = createStep(
    "extract-alert-values",
    async (input: ExtractAlertValuesInput, { container }) => {
        const logger = container.resolve("logger");
        const extractedValues: Record<string, ExtractedAlertValues> = {};

        for (const alert of input.alerts) {
            const { condition } = alert;
            const calculated_value = input.current_values[alert.option.id].value;
            const lookbackPositions = condition.lookbackPositions || 1;


            try {
                let extracted: ExtractedAlertValues;

                // Case 1: Time series (array)
                if (Array.isArray(calculated_value)) {
                    if (calculated_value.length === 0) {
                        logger.warn(`[Alert ${alert.id}] Time series is empty, skipping alert evaluation`);
                        continue;
                    }

                    const lastItem = calculated_value[calculated_value.length - 1];
                    const current = typeof lastItem === 'object' && lastItem !== null && 'value' in lastItem
                        ? Number(lastItem.value)
                        : Number(lastItem);

                    // Get reference value for relative comparison
                    const referenceIndex = calculated_value.length - 1 - lookbackPositions;
                    let reference: number | null = null;

                    if (referenceIndex >= 0) {
                        const refItem = calculated_value[referenceIndex];
                        reference = typeof refItem === 'object' && refItem !== null && 'value' in refItem
                            ? Number(refItem.value)
                            : Number(refItem);
                    } else if (condition.comparisonType === 'relative') {
                        logger.warn(
                            `[Alert ${alert.id}] Not enough data points for lookback. ` +
                            `Requested ${lookbackPositions} positions back, but only ${calculated_value.length} values available`
                        );
                    }

                    extracted = {
                        alert_id: alert.id,
                        current,
                        reference,
                        valueType: 'timeseries',
                        canDoRelative: reference !== null
                    };
                }
                // Case 2: Single value object { value: number }
                else if (typeof calculated_value === 'object' && calculated_value !== null && 'value' in calculated_value) {
                    extracted = {
                        alert_id: alert.id,
                        current: Number(calculated_value.value),
                        reference: null,
                        valueType: 'single',
                        canDoRelative: false
                    };

                    if (condition.comparisonType === 'relative') {
                        logger.warn(
                            `[Alert ${alert.id}] Cannot perform relative comparison on single-value statistic. ` +
                            `Relative comparisons require time series data.`
                        );
                    }
                }
                // Case 3: Raw number
                else {
                    extracted = {
                        alert_id: alert.id,
                        current: Number(calculated_value),
                        reference: null,
                        valueType: 'single',
                        canDoRelative: false
                    };

                    if (condition.comparisonType === 'relative') {
                        logger.warn(
                            `[Alert ${alert.id}] Cannot perform relative comparison on single-value statistic. ` +
                            `Relative comparisons require time series data.`
                        );
                    }
                }

                // Validate that we have valid numeric values
                if (!isFinite(extracted.current)) {
                    logger.warn(`[Alert ${alert.id}] Current value is not a valid number: ${extracted.current}`);
                    continue;
                }

                if (extracted.reference !== null && !isFinite(extracted.reference)) {
                    logger.warn(`[Alert ${alert.id}] Reference value is not a valid number: ${extracted.reference}`);
                    extracted.reference = null;
                    extracted.canDoRelative = false;
                }

                extractedValues[alert.id] = extracted;

            } catch (error: any) {
                logger.error(`[Alert ${alert.id}] Error extracting values: ${error.message}`);
            }
        }

        return new StepResponse(extractedValues);
    }
);
