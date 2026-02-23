import {
    buildDependencyOptionMap,
    hydrateDependencyInputOptions,
} from "../../../../modules/statistics/utils/dependency-option-map";

export const OPTION_GRAPH_FIELDS = [
    "*",
    "provider.*",
    "input_dependencies.*",
];

export const buildOptionGraph = async (
    query: any,
    rootIds: string[],
    seedOptions: any[]
) => {
    const optionMap = await buildDependencyOptionMap<any>(
        rootIds,
        seedOptions,
        async (idsToFetch) => {
            const { data: fetchedOptions } = await query.graph({
                entity: "statistics_option",
                filters: { id: idsToFetch },
                fields: OPTION_GRAPH_FIELDS,
            });

            return fetchedOptions || [];
        }
    );

    hydrateDependencyInputOptions(optionMap);

    return optionMap;
};

export const hydrateOptionsWithDependencies = async (query: any, options: any[]) => {
    if (!options.length) {
        return options;
    }

    const rootIds = options
        .map((option) => option?.id)
        .filter((id): id is string => Boolean(id));

    const optionMap = await buildOptionGraph(query, rootIds, options);

    return options.map((option) => optionMap.get(option.id) || option);
};
