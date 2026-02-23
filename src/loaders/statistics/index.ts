import { asFunction, asValue, Lifetime, asClass } from "@medusajs/framework/awilix"
import { moduleProviderLoader } from "@medusajs/framework/modules-sdk"
import {
    IMedusaInternalService,
    LoaderOptions,
    ModuleProvider,
    ModulesSdkTypes,
    Query,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

import { STATISTICS_MODULE } from "../../modules/statistics"
import * as providers from "../../modules/statistics/providers"
import StatisticsService from "../../modules/statistics/service"
import { logger, MedusaContainer } from "@medusajs/framework"

const PROVIDER_REGISTRATION_KEY = "stat_providers"

const registrationFn = async (klass: any, container: MedusaContainer, pluginOptions: any) => {
    if (!klass?.identifier) {
        throw new MedusaError(
            MedusaError.Types.INVALID_ARGUMENT,
            `Trying to register a statistics provider without a provider identifier.`
        )
    }

    const key = `sp_${klass.identifier}${pluginOptions.id ? `_${pluginOptions.id}` : ""
        }`

    // This is kind of a hack, since we want to be able to inject the QueryModule into the providers
    // but we can't do that as the QueryModule is not available at the time of registration.
    // So we register a factory that will create the provider instance with the QueryModule when it's requested.
    container.register({
        [key]: asValue(klass),
    });



    logger.info(`Registered statistics provider: ${klass.identifier} with key: ${key}`);
    container.registerAdd(PROVIDER_REGISTRATION_KEY, asValue({ id: key, display_name: klass.displayName || klass.identifier }))
}

export default async ({
    container,
    options,
}: LoaderOptions<
    (
        | ModulesSdkTypes.ModuleServiceInitializeOptions
        | ModulesSdkTypes.ModuleServiceInitializeCustomDataLayerOptions
    ) & {
        providers: ModuleProvider[]
    }
>): Promise<void> => {
    await moduleProviderLoader({
        container,
        providers: options?.providers || [],
        registerServiceFn: registrationFn,
    })

    await registerProvidersInDb({ container })
}

const registerProvidersInDb = async ({
    container,
}: LoaderOptions): Promise<void> => {
    const providersToLoad = container.resolve<{ id: string; display_name: string }[]>(PROVIDER_REGISTRATION_KEY, {
        allowUnregistered: true,
    })

    if (!providersToLoad?.length) {
        return
    }

    const financialSummaryService = container.resolve<IMedusaInternalService<any, any>>(
        "statisticsProviderService"
    );

    const existingProviders = await financialSummaryService.list(
        { id: providersToLoad.map(p => p.id) },
        {}
    )

    const upsertData: { id: string; is_enabled: boolean, display_name: string }[] = []

    for (const { id, display_name } of existingProviders) {
        if (!providersToLoad.some(p => p.id === id)) {
            upsertData.push({ id, is_enabled: false, display_name })
        }
    }

    for (const { id, display_name } of providersToLoad) {
        upsertData.push({ id, is_enabled: true, display_name })
    }

    await financialSummaryService.upsert(upsertData)
}
