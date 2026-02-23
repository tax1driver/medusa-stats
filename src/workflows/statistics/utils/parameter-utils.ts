import { z } from "zod";
import { ParameterFieldDefinition } from "../../../modules/statistics/providers/provider";

interface ValidateParameterDataOptions {
    partial?: boolean;
}

interface ValidateParameterDataResult {
    isValid: boolean;
    errors: string[];
    isComplete: boolean;
}

/**
 * Parse selector syntax: "selector:paramName" or just "paramName"
 */
export function parseSelector(key: string): [string | null, string] {
    const parts = key.split(':');
    if (parts.length === 1) {
        return [null, key];
    }
    return [parts[0], parts[1]];
}

/**
 * Simple wildcard matching (* supported)
 */
export function wildcardMatch(value: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(value);
}

/**
 * Check if selector matches the option
 */
export function selectorMatches(
    selector: string,
    localOptionName: string,
    providerOptionName: string,
    providerId: string
): boolean {
    if (selector.startsWith('@')) {
        // Local option name match: @name
        const pattern = selector.slice(1);
        return wildcardMatch(localOptionName, pattern);
    } else if (selector.includes('.') || selector.includes('*')) {
        // Provider match: provider.*
        const [providerPattern, optionPattern] = selector.split(':');
        if (optionPattern) {
            // Both provider and option pattern
            return wildcardMatch(providerId, providerPattern) &&
                wildcardMatch(providerOptionName, optionPattern);
        } else {
            // Just provider pattern with option name as param
            return wildcardMatch(providerId, providerPattern);
        }
    }
    return false;
}

/**
 * Merge parameters from option, view (with selectors), and runtime
 */
export function mergeParameters(
    optionData: Record<string, any>,
    viewData: Record<string, any>,
    runtimeData: Record<string, any>,
    localOptionName: string,
    providerOptionName: string,
    providerId: string
): Record<string, any> {
    const merged = { ...optionData };

    // Apply view data with selector matching
    for (const [key, value] of Object.entries(viewData)) {
        const [selector, paramName] = parseSelector(key);

        if (!paramName) {
            // No selector, apply to all
            merged[key] = value;
        } else if (selector && selectorMatches(selector, localOptionName, providerOptionName, providerId)) {
            // Selector matches, apply parameter
            merged[paramName] = value;
        }
    }

    // Runtime data overrides everything
    Object.assign(merged, runtimeData);

    return merged;
}

/**
 * Validate parameters against field definitions
 */
export function validateParameters(
    parameters: Record<string, any>,
    fields: ParameterFieldDefinition[]
): Record<string, any> {
    const schema = buildParameterSchema(fields);

    return schema.parse(parameters);
}

/**
 * Build Zod schema from parameter field definitions
 */
export function buildParameterSchema(
    fields: ParameterFieldDefinition[],
    partial = false
) {
    const schema = z.object(
        fields.reduce((acc, field) => {
            if (field.schema) {
                acc[field.name] = field.schema;
            }
            return acc;
        }, {} as Record<string, z.ZodType<any>>)
    );

    return partial ? schema.partial() : schema;
}

/**
 * Validate parameter data and return formatted validation state
 */
export function validateParameterData(
    parameters: Record<string, any>,
    fields: ParameterFieldDefinition[],
    options: ValidateParameterDataOptions = {}
): ValidateParameterDataResult {
    const schema = buildParameterSchema(fields, options.partial ?? false);

    try {
        schema.parse(parameters);
        return {
            isValid: true,
            errors: [],
            isComplete: true,
        };
    } catch (error) {
        if (!(error instanceof z.ZodError)) {
            return {
                isValid: false,
                errors: ["Unknown validation error"],
                isComplete: false,
            };
        }

        const errors = error.errors.map((validationError) =>
            `${validationError.path.join(".")}: ${validationError.message}`
        );

        const missingRequiredValues = error.errors.some(
            (validationError) => validationError.code === "invalid_type"
        );

        return {
            isValid: false,
            errors,
            isComplete: !missingRequiredValues,
        };
    }
}

/**
 * Resolve provider statistic definition by provider/option identifiers
 */
export function resolveStatisticDefinition(
    availableStatistics: Record<string, any[]>,
    providerId: string,
    providerOptionName: string
): { statDefinition: any | null; error: string | null } {
    const providerStats = availableStatistics[providerId];

    if (!providerStats) {
        return {
            statDefinition: null,
            error: `Provider ${providerId} not found or has no available statistics`,
        };
    }

    const statDefinition = providerStats.find((statistic: any) => statistic.id === providerOptionName);

    if (!statDefinition) {
        return {
            statDefinition: null,
            error: `Statistic ${providerOptionName} not found in provider ${providerId}`,
        };
    }

    return {
        statDefinition,
        error: null,
    };
}

/**
 * Check if option data is complete (has all required values)
 */
export function hasCompleteData(data: Record<string, any> | null | undefined): boolean {
    if (!data) return false;

    // Check if all values are defined (not null/undefined)
    return Object.values(data).every(value =>
        value !== null && value !== undefined
    );
}
