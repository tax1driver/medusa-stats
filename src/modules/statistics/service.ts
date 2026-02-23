import { InjectManager, MedusaContext, MedusaService, MedusaError, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { StatisticsOption, StatisticsProvider, StatisticsView, StatisticsAlert, StatisticsAlertLog, StatisticsChart, StatisticOptionInput } from "./models";
import { EntityManager, SqlEntityManager, t } from "@medusajs/framework/mikro-orm/knex";
import { Context, DAL, InferTypeOf } from "@medusajs/framework/types";
import { AbstractStatisticsProvider } from "./providers/provider";
import { container, logger, MedusaContainer, Query } from "@medusajs/framework";
import { asValue } from "@medusajs/framework/awilix";

type StatisticsProvider = InferTypeOf<typeof StatisticsProvider>;

export default class StatisticsService extends MedusaService({
    StatisticsView,
    StatisticsOption,
    StatisticsProvider,
    StatisticsAlert,
    StatisticsAlertLog,
    StatisticsChart,
    StatisticOptionInput
}) {
    protected providerRepository_: DAL.RepositoryService<StatisticsProvider>;
    protected container_: any;

    constructor({
        statisticsProviderRepository,
        ...container
    }: {
        statisticsProviderRepository: DAL.RepositoryService<StatisticsProvider>;
    }) {
        super(...arguments);
        this.providerRepository_ = statisticsProviderRepository;
        this.container_ = container as any;
    }

    async upsertStatisticsProviders(data: any[], context?: any) {
        return this.providerRepository_.upsert(data, context);
    }

    /**
     * Get provider instance with QueryModule injected via child container
     */
    getProvider(providerId: string, query: Query): AbstractStatisticsProvider {
        const ProviderClass = this.container_[providerId];
        if (!ProviderClass) {
            throw new MedusaError(
                MedusaError.Types.NOT_FOUND,
                `Provider ${providerId} not found`
            );
        }


        const childContainer = {
            ...container,
            [ContainerRegistrationKeys.QUERY]: query,
        }


        return new ProviderClass(childContainer);
    }

    /**
     * Add statistics (series) to a chart
     */
    async addStatisticsToChart(
        chartId: string,
        statisticIds: string[],
    ) {
        const chart = await this.retrieveStatisticsChart(chartId, { relations: ["statistics"] });

        const updatedChart = await this.updateStatisticsCharts({
            id: chartId,
            statistics: [
                ...(chart.statistics.map(s => s.id) || []),
                ...statisticIds.map(id => (id))
            ]
        })

        return { chart: updatedChart };
    }

    /**
     * Remove statistics (series) from a chart
     */
    async removeStatisticsFromChart(
        chartId: string,
        statisticIds: string[],
    ) {
        const chart = await this.retrieveStatisticsChart(chartId, { relations: ["statistics"] });

        const updatedChart = await this.updateStatisticsCharts({
            id: chartId,
            statistics: [
                ...(chart.statistics.map(s => s.id) || []).filter(id => !statisticIds.includes(id))
            ]
        })

        return { chart: updatedChart };
    }





    /**
     * Validate if an option can be deleted (check dependencies)
     * Throws error if option is used as input by other composite statistics
     */
    async validateOptionDeletion(ids: string | string[]): Promise<void> {
        const idArray = Array.isArray(ids) ? ids : [ids];

        for (const id of idArray) {

            const option = await this.retrieveStatisticsOption(id, {
                relations: ["dependent_composites"],
            });


            if (option.dependent_composites && option.dependent_composites.length > 0) {
                const dependentNames = option.dependent_composites
                    .map((c: any) => c.local_option_name)
                    .join(", ");

                throw new MedusaError(
                    MedusaError.Types.NOT_ALLOWED,
                    `Cannot delete option "${option.local_option_name}" because it is used as input by the following composite statistics: ${dependentNames}`
                );
            }
        }
    }

    /**
     * Clone a statistics option with all its configuration and dependencies
     * Creates an independent copy that can be customized
     */
    async cloneOption(
        sourceId: string,
        overrides: {
            local_option_name?: string;
            parameter_config?: Record<string, { value?: any; locked?: boolean }> | null | undefined;
            preset?: boolean;
        } = {}
    ) {
        const clonedIdBySourceId = new Map<string, string>();
        const cloningStack = new Set<string>();

        const cloneRecursive = async (
            optionId: string,
            isRoot: boolean = false
        ): Promise<any> => {
            const existingCloneId = clonedIdBySourceId.get(optionId);
            if (existingCloneId) {
                return this.retrieveStatisticsOption(existingCloneId, {
                    relations: ["input_dependencies", "provider"],
                });
            }

            if (cloningStack.has(optionId)) {
                throw new MedusaError(
                    MedusaError.Types.INVALID_DATA,
                    `Circular dependency detected while cloning option ${optionId}`
                );
            }

            cloningStack.add(optionId);

            const source = await this.retrieveStatisticsOption(optionId, {
                relations: ["input_dependencies", "provider"],
            });

            const clonedInputDependencies: any[] = [];

            if (source.input_dependencies && source.input_dependencies.length > 0) {
                for (const dep of source.input_dependencies as any[]) {
                    const sourceInputId = dep.input_option?.id || dep.input_option_id;

                    if (!sourceInputId) {
                        continue;
                    }

                    const clonedInput = await cloneRecursive(sourceInputId, false);

                    clonedInputDependencies.push({
                        input_option_id: clonedInput.id,
                        parameter_name: dep.parameter_name,
                        order: dep.order,
                        metadata: dep.metadata,
                    });
                }
            }

            const cloneData: any = {
                provider_option_name: source.provider_option_name,
                local_option_name: isRoot
                    ? (overrides.local_option_name || source.local_option_name)
                    : source.local_option_name,
                data: source.data,
                visualization_config: source.visualization_config,
                cache_options: source.cache_options,
                parameter_config: isRoot
                    ? (overrides.parameter_config ?? source.parameter_config)
                    : source.parameter_config,
                preset: isRoot
                    ? (overrides.preset !== undefined ? overrides.preset : false)
                    : false,
                provider: source.provider?.id,
            };

            if (clonedInputDependencies.length > 0) {
                cloneData.input_dependencies = clonedInputDependencies;
            }

            const clone = await this.createStatisticsOptions(cloneData);
            clonedIdBySourceId.set(optionId, clone.id);
            cloningStack.delete(optionId);

            return clone;
        };

        return await cloneRecursive(sourceId, true);
    }

    /**
     * Get complete dependency graph for an option
     * Recursively builds tree structure for visualization
     */
    async getDependencyGraph(optionId: string): Promise<any> {
        const visited = new Set<string>();

        const buildTree = async (id: string, depth: number = 0): Promise<any> => {

            if (visited.has(id)) {
                return { id, circular: true, depth };
            }
            visited.add(id);


            const option = await this.retrieveStatisticsOption(id, {
                relations: ["input_dependencies", "input_dependencies.input_option"],
            });

            const node: any = {
                id: option.id,
                name: option.local_option_name,
                provider_option_name: option.provider_option_name,
                depth,
                dependencies: [],
            };


            if (option.input_dependencies && option.input_dependencies.length > 0) {
                for (const dep of option.input_dependencies as any[]) {
                    const inputId = dep.input_option?.id || dep.input_option_id;
                    const paramName = dep.parameter_name;
                    const childNode = await buildTree(inputId, depth + 1);
                    node.dependencies.push({
                        parameter_name: paramName,
                        ...childNode,
                    });
                }
            }

            return node;
        };

        return buildTree(optionId);
    }

    /**
     * List preset options available for cloning
     * Convenience method for filtering preset options
     */
    async listPresets(filters: any = {}, config: any = {}) {
        return this.listStatisticsOptions(
            { ...filters, preset: true },
            config
        );
    }

}
