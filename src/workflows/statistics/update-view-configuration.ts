import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { validateViewInputStep } from "./steps/validate-view-input";
import { updateViewStep } from "./steps/update-view";

export interface UpdateViewConfigurationInput {
    id: string;
    name?: string;
    description?: string;
    stats_data?: Record<string, any>;
    layout_config?: Record<string, any>;
    metadata?: Record<string, any>;
    period_type?: "rolling" | "calendar" | "custom";
    period_config?: Record<string, any>;
    interval?: number;
}

/**
 * Updates a statistics view configuration.
 * 
 * Note: Cached statistics are not automatically invalidated when view configuration changes.
 * Cache invalidation requires specific state parameters (periodStart, periodEnd, interval).
 * Cached data will expire naturally via TTL (600s), or can be manually invalidated via
 * the cache invalidation endpoint with specific state parameters if immediate refresh is needed.
 */
export const updateViewConfigurationWorkflow = createWorkflow(
    "update-stat-view-configuration",
    (input: UpdateViewConfigurationInput) => {

        const updatedViewResult = updateViewStep(input);

        return new WorkflowResponse(updatedViewResult.length ? updatedViewResult[0] : null);
    }
);
