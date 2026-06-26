import { z } from "zod";

export function parseSelector(key: string): [string | null, string] {
    const parts = key.split(':');
    if (parts.length === 1) {
        return [null, key];
    }
    return [parts[0], parts[1]];
}

export function wildcardMatch(value: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(value);
}

export function selectorMatches(
    selector: string,
    localOptionName: string,
    providerOptionName: string,
    providerId: string
): boolean {
    if (selector.startsWith('@')) {

        const pattern = selector.slice(1);
        return wildcardMatch(localOptionName, pattern);
    } else if (selector.includes('.') || selector.includes('*')) {

        const [providerPattern, optionPattern] = selector.split(':');
        if (optionPattern) {

            return wildcardMatch(providerId, providerPattern) &&
                wildcardMatch(providerOptionName, optionPattern);
        } else {

            return wildcardMatch(providerId, providerPattern);
        }
    }
    return false;
}

export function mergeParameters(
    optionData: Record<string, any>,
    viewData: Record<string, any>,
    runtimeData: Record<string, any>,
    localOptionName: string,
    providerOptionName: string,
    providerId: string
): Record<string, any> {
    const merged = { ...optionData };


    for (const [key, value] of Object.entries(viewData)) {
        const [selector, paramName] = parseSelector(key);

        if (!paramName) {

            merged[key] = value;
        } else if (selector && selectorMatches(selector, localOptionName, providerOptionName, providerId)) {

            merged[paramName] = value;
        }
    }


    Object.assign(merged, runtimeData);

    return merged;
}
