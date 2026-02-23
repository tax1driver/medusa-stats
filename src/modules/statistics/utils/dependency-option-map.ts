type DependencyEdge = {
    input_option_id?: string | null;
    input_option?: {
        id?: string | null;
    } | null;
};

export type DependencyOptionLike = {
    id: string;
    input_dependencies?: DependencyEdge[];
};

const getDependencyIds = (option: DependencyOptionLike): string[] => {
    if (!option.input_dependencies?.length) {
        return [];
    }

    return option.input_dependencies
        .map((dep) => dep?.input_option?.id || dep?.input_option_id)
        .filter((id): id is string => Boolean(id));
};

export const buildDependencyOptionMap = async <T extends DependencyOptionLike>(
    rootIds: string[],
    seedOptions: T[],
    fetchByIds: (ids: string[]) => Promise<T[]>
) => {
    const optionMap = new Map<string, T>();
    const pendingIds = new Set<string>();

    seedOptions.forEach((option) => {
        if (!option?.id) {
            return;
        }

        optionMap.set(option.id, option);

        getDependencyIds(option).forEach((dependencyId) => {
            if (!optionMap.has(dependencyId)) {
                pendingIds.add(dependencyId);
            }
        });
    });

    rootIds.forEach((id) => {
        if (id && !optionMap.has(id)) {
            pendingIds.add(id);
        }
    });

    while (pendingIds.size > 0) {
        const idsToFetch = Array.from(pendingIds).filter((id) => !optionMap.has(id));
        pendingIds.clear();

        if (idsToFetch.length === 0) {
            break;
        }

        const fetchedOptions = await fetchByIds(idsToFetch);

        fetchedOptions.forEach((option) => {
            if (!option?.id) {
                return;
            }

            optionMap.set(option.id, option);
        });

        fetchedOptions.forEach((option) => {
            getDependencyIds(option).forEach((dependencyId) => {
                if (!optionMap.has(dependencyId)) {
                    pendingIds.add(dependencyId);
                }
            });
        });
    }

    return optionMap;
};

export const hydrateDependencyInputOptions = <T extends DependencyOptionLike>(
    optionMap: Map<string, T>
) => {
    optionMap.forEach((option) => {
        if (!option.input_dependencies) {
            return;
        }

        option.input_dependencies = option.input_dependencies.map((dep) => ({
            ...dep,
            input_option: optionMap.get(dep.input_option?.id || dep.input_option_id || "") || dep.input_option || null,
        }));
    });
};
