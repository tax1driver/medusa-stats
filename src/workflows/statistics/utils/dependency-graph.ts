import StatisticsService from "../../../modules/statistics/service";
import { buildDependencyOptionMap } from "../../../modules/statistics/utils/dependency-option-map";
import { MedusaError } from "@medusajs/framework/utils";

/**
 * Represents a node in the dependency graph
 */
export interface DependencyNode {
    id: string;
    name: string;
    provider_option_name: string;
    parameter_name?: string;
    dependencies: DependencyNode[];
    depth: number;
}

/**
 * Result of dependency resolution
 */
export interface DependencyResolution {
    calculationOrder: string[];
    dependencyTree: DependencyNode;
    hasCycles: boolean;
    cycleNodes?: string[];
}

/**
 * Utility class for dependency graph operations
 */
export class DependencyGraphUtils {
    /**
     * Build complete dependency tree for an option
     */
    static async buildDependencyTree(
        optionId: string,
        statisticsService: StatisticsService,
        visited: Set<string> = new Set(),
        depth: number = 0
    ): Promise<DependencyNode> {
        const optionMap = await buildDependencyOptionMap<any>(
            [optionId],
            [],
            async (idsToFetch) => {
                const options = await Promise.all(
                    idsToFetch.map((id) =>
                        statisticsService.retrieveStatisticsOption(id, {
                            relations: ["input_dependencies", "input_dependencies.input_option"],
                        })
                    )
                );

                return options;
            }
        );

        const buildNode = (
            currentId: string,
            currentDepth: number,
            path: Set<string>
        ): DependencyNode => {
            if (path.has(currentId)) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    `Circular dependency detected at option: ${currentId}`
                );
            }

            const option = optionMap.get(currentId);

            if (!option) {
                throw new MedusaError(
                    MedusaError.Types.NOT_FOUND,
                    `Option not found in dependency graph: ${currentId}`
                );
            }

            const nextPath = new Set(path);
            nextPath.add(currentId);

            const node: DependencyNode = {
                id: option.id,
                name: option.local_option_name,
                provider_option_name: option.provider_option_name,
                depth: currentDepth,
                dependencies: [],
            };

            if (option.input_dependencies?.length) {
                for (const dep of option.input_dependencies as any[]) {
                    const inputId = dep.input_option?.id || dep.input_option_id;

                    if (!inputId) {
                        continue;
                    }

                    const childNode = buildNode(inputId, currentDepth + 1, nextPath);
                    childNode.parameter_name = dep.parameter_name;
                    node.dependencies.push(childNode);
                }
            }

            return node;
        };

        return buildNode(optionId, depth, new Set(visited));
    }

    /**
     * Get calculation order using topological sort
     * Dependencies must be calculated before their dependents
     */
    static getCalculationOrder(tree: DependencyNode): string[] {
        const order: string[] = [];
        const visited = new Set<string>();

        const visit = (node: DependencyNode) => {
            if (visited.has(node.id)) {
                return;
            }


            for (const dep of node.dependencies) {
                visit(dep);
            }


            visited.add(node.id);
            order.push(node.id);
        };

        visit(tree);
        return order;
    }

    /**
     * Detect circular dependencies in the graph
     */
    static detectCycles(
        optionId: string,
        allDependencies: Map<string, string[]>,
        visited: Set<string> = new Set(),
        recursionStack: Set<string> = new Set()
    ): string[] | null {
        visited.add(optionId);
        recursionStack.add(optionId);

        const dependencies = allDependencies.get(optionId) || [];
        for (const depId of dependencies) {
            if (!visited.has(depId)) {
                const cycle = this.detectCycles(depId, allDependencies, visited, recursionStack);
                if (cycle) {
                    return [optionId, ...cycle];
                }
            } else if (recursionStack.has(depId)) {

                return [optionId, depId];
            }
        }

        recursionStack.delete(optionId);
        return null;
    }

    /**
     * Validate dependency integrity
     * Checks for cycles and validates all dependencies exist
     */
    static async validateDependencies(
        optionId: string,
        statisticsService: StatisticsService
    ): Promise<{ isValid: boolean; errors: string[] }> {
        const errors: string[] = [];

        try {

            await this.buildDependencyTree(optionId, statisticsService);
        } catch (error: any) {
            if (error.message.includes("Circular dependency")) {
                errors.push(error.message);
            } else {
                errors.push(`Failed to build dependency tree: ${error.message}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    /**
     * Flatten dependency tree to list of all option IDs
     */
    static flattenTree(tree: DependencyNode): string[] {
        const ids = new Set<string>();

        const collect = (node: DependencyNode) => {
            ids.add(node.id);
            for (const dep of node.dependencies) {
                collect(dep);
            }
        };

        collect(tree);
        return Array.from(ids);
    }
}
