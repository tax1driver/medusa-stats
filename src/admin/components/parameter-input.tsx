import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Input, Label, Select, Switch, Text, Textarea } from "@medusajs/ui"

interface ParameterField {
    name: string
    type: string
    metadata: Record<string, any>
}

type RenderFn = (props: {
    field: ParameterField
    value: any
    onChange: (v: any) => void
    entityOptions?: Array<{ value: string; label: string }>
    isLoadingEntities?: boolean
    statContext: { provider_id: string; stat_id: string }
    t: (key: string, fallback?: string) => string
}) => React.ReactElement

const labelWithDescription = (
    field: ParameterField,
    statContext: { provider_id: string; stat_id: string },
    t: (key: string, fallback?: string) => string,
    extraClass?: string,
) => {
    const label = t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.name`, field.metadata.label || field.name)
    const description = t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.description`, field.metadata.description || "")
    return (
        <>
            <Label htmlFor={field.name}>{label}</Label>
            {description && (
                <Text className={`text-ui-fg-subtle text-xs mt-0.5${extraClass ? " " + extraClass : ""}`}>
                    {description}
                </Text>
            )}
        </>
    )
}

const renderBoolean: RenderFn = ({ field, value, onChange, statContext, t }) => (
    <div className="flex items-center justify-between">
        <div className="flex-1">
            <Label htmlFor={field.name}>{t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.name`, field.metadata.label || field.name)}</Label>
            {t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.description`, field.metadata.description || "") && (
                <Text className="text-ui-fg-subtle text-xs mt-0.5">
                    {t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.description`, field.metadata.description || "")}
                </Text>
            )}
        </div>
        <Switch
            id={field.name}
            checked={value === true}
            onCheckedChange={onChange}
        />
    </div>
)

const renderSelect: RenderFn = ({ field, value, onChange, statContext, t }) => (
    <div>
        {labelWithDescription(field, statContext, t, "mb-1")}
        <Select value={value ?? ""} onValueChange={onChange}>
            <Select.Trigger id={field.name}>
                <Select.Value
                    placeholder={
                        t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.placeholder`, field.metadata.placeholder) ||
                        `Select ${t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.name`, field.metadata.label || field.name)}`
                    }
                />
            </Select.Trigger>
            <Select.Content>
                {(field.metadata.options || []).map(
                    (option: string) => (
                        <Select.Item key={String(option)} value={String(option)}>
                            {t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.options.${option}`, option)}
                        </Select.Item>
                    ),
                )}
            </Select.Content>
        </Select>
    </div>
)

const renderMultiselect: RenderFn = ({ field, value, onChange, statContext, t }) => {
    const selectedValues: string[] = Array.isArray(value) ? value : []
    return (
        <div>
            {labelWithDescription(field, statContext, t, "mb-1")}
            <Select
                value={selectedValues.join(",")}
                onValueChange={(val) => onChange(val ? val.split(",") : [])}
            >
                <Select.Trigger id={field.name}>
                    <Select.Value
                        placeholder={
                            t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.placeholder`, field.metadata.placeholder) ||
                            `Select ${t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.name`, field.metadata.label || field.name)}`
                        }
                    >
                        {selectedValues.length > 0
                            ? `${selectedValues.length} selected`
                            : null}
                    </Select.Value>
                </Select.Trigger>
                <Select.Content>
                    {(field.metadata.options || []).map(
                        (option: string) => (
                            <Select.Item key={String(option)} value={String(option)}>
                                {t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.options.${option}`, option)}
                            </Select.Item>
                        ),
                    )}
                </Select.Content>
            </Select>
        </div>
    )
}

const renderEntity: RenderFn = ({
    field,
    value,
    onChange,
    entityOptions = [],
    isLoadingEntities = false,
    statContext,
    t,
}) => (
    <div>
        {labelWithDescription(field, statContext, t, "mb-1")}
        <Select
            value={value ?? ""}
            onValueChange={onChange}
            disabled={isLoadingEntities}
        >
            <Select.Trigger id={field.name}>
                <Select.Value
                    placeholder={
                        t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.placeholder`, field.metadata.placeholder) ||
                        `Select ${t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.name`, field.metadata.label || field.name)}`
                    }
                />
            </Select.Trigger>
            <Select.Content>
                {isLoadingEntities ? (
                    <Select.Item value="___loading___" disabled>
                        Loading...
                    </Select.Item>
                ) : (
                    entityOptions.map((option) => (
                        <Select.Item key={option.value} value={option.value}>
                            {option.label}
                        </Select.Item>
                    ))
                )}
            </Select.Content>
        </Select>
    </div>
)

const renderEntities: RenderFn = ({
    field,
    value,
    onChange,
    entityOptions = [],
    isLoadingEntities = false,
    statContext,
    t,
}) => {
    const selectedValues: string[] = Array.isArray(value) ? value : []
    return (
        <div>
            {labelWithDescription(field, statContext, t, "mb-1")}
            <Select
                value={selectedValues.join(",")}
                onValueChange={(val) =>
                    onChange(val ? val.split(",").filter(Boolean) : [])
                }
                disabled={isLoadingEntities}
            >
                <Select.Trigger id={field.name}>
                    <Select.Value
                        placeholder={
                            t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.placeholder`, field.metadata.placeholder) ||
                            `Select ${t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.name`, field.metadata.label || field.name)}`
                        }
                    >
                        {selectedValues.length > 0
                            ? `${selectedValues.length} selected`
                            : null}
                    </Select.Value>
                </Select.Trigger>
                <Select.Content>
                    {isLoadingEntities ? (
                        <Select.Item value="___loading___" disabled>
                            Loading...
                        </Select.Item>
                    ) : (
                        entityOptions.map((option) => (
                            <Select.Item key={option.value} value={option.value}>
                                {option.label}
                            </Select.Item>
                        ))
                    )}
                </Select.Content>
            </Select>
        </div>
    )
}

const renderNumber: RenderFn = ({ field, value, onChange, statContext, t }) => (
    <div>
        {labelWithDescription(field, statContext, t, "mb-1")}
        <Input
            id={field.name}
            type="number"
            placeholder={t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.placeholder`, field.metadata.placeholder || "")}
            value={value ?? ""}
            onChange={(e) =>
                onChange(e.target.value ? Number(e.target.value) : null)
            }
        />
    </div>
)

const renderCurrency: RenderFn = ({ field, value, onChange, statContext, t }) => (
    <div>
        {labelWithDescription(field, statContext, t, "mb-1")}
        <Input
            id={field.name}
            type="number"
            placeholder={t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.placeholder`, field.metadata.placeholder || "")}
            step="0.01"
            value={value ?? ""}
            onChange={(e) =>
                onChange(e.target.value ? Number(e.target.value) : null)
            }
        />
    </div>
)

const renderDate: RenderFn = ({ field, value, onChange, statContext, t }) => {
    const dateValue = value ? new Date(value).toISOString().split("T")[0] : ""
    return (
        <div>
            {labelWithDescription(field, statContext, t, "mb-1")}
            <Input
                id={field.name}
                type="date"
                value={dateValue}
                onChange={(e) =>
                    onChange(
                        e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                    )
                }
            />
        </div>
    )
}

const renderDateRange: RenderFn = ({ field, value, onChange, statContext, t }) => {
    const rangeValue = value || { start: "", end: "" }
    return (
        <div>
            {labelWithDescription(field, statContext, t, "mb-1")}
            <div className="flex gap-2">
                <Input
                    type="date"
                    placeholder={t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.startPlaceholder`, "Start date")}
                    value={
                        rangeValue.start
                            ? new Date(rangeValue.start).toISOString().split("T")[0]
                            : ""
                    }
                    onChange={(e) =>
                        onChange({
                            ...rangeValue,
                            start: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : null,
                        })
                    }
                />
                <Input
                    type="date"
                    placeholder={t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.endPlaceholder`, "End date")}
                    value={
                        rangeValue.end
                            ? new Date(rangeValue.end).toISOString().split("T")[0]
                            : ""
                    }
                    onChange={(e) =>
                        onChange({
                            ...rangeValue,
                            end: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : null,
                        })
                    }
                />
            </div>
        </div>
    )
}

const renderJson: RenderFn = ({ field, value, onChange, statContext, t }) => (
    <div>
        {labelWithDescription(field, statContext, t, "mb-1")}
        <Textarea
            id={field.name}
            placeholder={t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.placeholder`, field.metadata.placeholder || "")}
            value={
                typeof value === "object"
                    ? JSON.stringify(value, null, 2)
                    : value ?? ""
            }
            onChange={(e) => {
                try {
                    onChange(JSON.parse(e.target.value))
                } catch {
                    onChange(e.target.value)
                }
            }}
            rows={4}
        />
    </div>
)

const renderCustom: RenderFn = ({ field, value, onChange, statContext, t }) => (
    <div>
        {labelWithDescription(field, statContext, t, "mb-1")}
        <Text className="text-ui-fg-warning text-xs mb-1">
            Custom field type - using text input
        </Text>
        <Input
            id={field.name}
            type="text"
            placeholder={t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.placeholder`, field.metadata.placeholder || "")}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
        />
    </div>
)

const renderText: RenderFn = ({ field, value, onChange, statContext, t }) => (
    <div>
        <Label htmlFor={field.name}>{t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.name`, field.metadata.label || field.name)}</Label>
        {t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.description`, field.metadata.description || "") && (
            <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">
                {t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.description`, field.metadata.description || "")}
            </Text>
        )}
        <Input
            id={field.name}
            type="text"
            placeholder={t(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.placeholder`, field.metadata.placeholder || "")}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
        />
    </div>
)

const fieldRenderers: Record<string, RenderFn> = {
    boolean: renderBoolean,
    select: renderSelect,
    enum: renderSelect,
    multiselect: renderMultiselect,
    array: renderMultiselect,
    entity: renderEntity,
    entities: renderEntities,
    number: renderNumber,
    currency: renderCurrency,
    date: renderDate,
    daterange: renderDateRange,
    json: renderJson,
    custom: renderCustom,
    text: renderText,
}

export const ParameterInput = ({
    field,
    value,
    onChange,
    statContext,
}: {
    field: ParameterField
    value: any
    onChange: (value: any) => void
    statContext: { provider_id: string; stat_id: string }
}) => {
    const { t } = useTranslation("stats")
    const translate = (key: string, fallback?: string): string => String(t(key, fallback || ""))
    const [entityOptions, setEntityOptions] = useState<
        Array<{ value: string; label: string }>
    >([])
    const [isLoadingEntities, setIsLoadingEntities] = useState(false)

    // useState(() => {
    //     if (
    //         (field.type === "entity" || field.type === "entities") &&
    //         field.metadata.entityReference
    //     ) {
    //         setIsLoadingEntities(true)
    //         fetchEntityOptions(field.metadata.entityReference.entity)
    //             .then(setEntityOptions)
    //             .finally(() => setIsLoadingEntities(false))
    //     }
    // })

    const renderer = fieldRenderers[field.type]
    const props = { field, value, onChange, entityOptions, isLoadingEntities, statContext, t: translate }

    if (renderer) {
        return renderer(props)
    }

    return (
        <div>
            <Label htmlFor={field.name}>
                {translate(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.name`, (field as any).label)}
            </Label>
            {translate(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.description`, (field as any).description || "") && (
                <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">
                    {translate(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.description`, (field as any).description || "")}
                </Text>
            )}
            <Input
                id={field.name}
                type="text"
                placeholder={translate(`${statContext.provider_id}.${statContext.stat_id}.fields.${field.name}.placeholder`, (field as any).placeholder || "")}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value || null)}
            />
        </div>
    )
}
