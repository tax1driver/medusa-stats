import { logger, type MedusaContainer } from "@medusajs/framework"
import {
    dynamicImport,
    isFileSkipped,
    isString,
    normalizeImportPathWithSource,
    promiseAll,
} from "@medusajs/framework/utils"

type LoaderSource = {
    resolve?: string | unknown
    options?: Record<string, unknown>
}

type ResolveDefinitionsFn<TDefinition> = (loadedProvider: unknown) => TDefinition[]

type RegisterDefinitionFn<TDefinition, TContext> = (args: {
    definition: TDefinition
    container: MedusaContainer
    context: TContext
    pluginOptions: Record<string, unknown>
    moduleName: string
}) => Promise<void>

export type DefinitionLoaderOptions<TDefinition, TContext> = {
    container: MedusaContainer
    source: LoaderSource
    context: TContext
    resolveDefinitions: ResolveDefinitionsFn<TDefinition>
    registerDefinition: RegisterDefinitionFn<TDefinition, TContext>
}

export async function definitionLoader<TDefinition, TContext>({
    container,
    source,
    context,
    resolveDefinitions,
    registerDefinition,
}: DefinitionLoaderOptions<TDefinition, TContext>): Promise<void> {
    let loadedProvider: unknown
    const moduleName = String(source.resolve ?? "")
    const pluginOptions = source.options ?? {}

    try {
        loadedProvider = source.resolve

        if (isString(source.resolve)) {
            const normalizedPath = normalizeImportPathWithSource(source.resolve)
            loadedProvider = await dynamicImport(normalizedPath)
        }
    } catch {
        throw new Error(
            `Unable to find module ${moduleName} -- perhaps you need to install its package?`
        )
    }

    if (isFileSkipped(loadedProvider)) {
        return
    }

    if (!loadedProvider) {
        throw new Error(
            `Module ${moduleName} does not export a definition provider.`
        )
    }

    const definitions = resolveDefinitions(loadedProvider)

    await promiseAll(
        definitions.map(async (definition) => {
            await registerDefinition({
                definition,
                container,
                context,
                pluginOptions,
                moduleName,
            })
        })
    )
}

export type DefinitionsLoaderOptions<TDefinition, TContext> = {
    container: MedusaContainer
    sources: LoaderSource[]
    context: TContext
    resolveDefinitions: ResolveDefinitionsFn<TDefinition>
    registerDefinition: RegisterDefinitionFn<TDefinition, TContext>
}

export async function definitionsLoader<TDefinition, TContext>({
    container,
    sources,
    context,
    resolveDefinitions,
    registerDefinition,
}: DefinitionsLoaderOptions<TDefinition, TContext>): Promise<void> {
    if (!sources.length) {
        return
    }

    await promiseAll(
        sources.map(async (source) => {
            await definitionLoader({
                container,
                source,
                context,
                resolveDefinitions,
                registerDefinition,
            })
        })
    )

    logger.info(`Processed ${sources.length} definition provider(s).`)
}
