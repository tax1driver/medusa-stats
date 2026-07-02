import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

export async function checkViewOwnership(
    scope: any,
    viewId: string,
    userId: string,
): Promise<boolean> {
    const query = scope.resolve(ContainerRegistrationKeys.QUERY)

    const { data } = await query.graph({
        entity: "statistics_view",
        fields: ["id", "is_private", "user.id"],
        filters: { id: viewId },
    })

    const view = data?.[0] as any
    if (!view) {
        throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            `View ${viewId} not found`,
        )
    }

    if (!view.is_private) return true

    const linkedUserIds = (view.user || []).map((u: any) => u.id)
    return linkedUserIds.includes(userId)
}
