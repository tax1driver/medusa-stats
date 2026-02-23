import { useState } from "react"
import { Input, Label, Select, Switch, Text, Textarea } from "@medusajs/ui"
import type { ParameterFieldDefinition } from "../lib/statistics/api";

// Mock function to fetch entity data - will be replaced with actual implementation
export const fetchEntityOptions = async (entityType: string) => {
    // TODO: Replace with actual API calls based on entity type
    const mockData: Record<string, Array<{ value: string; label: string }>> = {
        customer: [
            { value: "cust_1", label: "John Doe" },
            { value: "cust_2", label: "Jane Smith" },
            { value: "cust_3", label: "Bob Johnson" }
        ],
        product: [
            { value: "prod_1", label: "Product A" },
            { value: "prod_2", label: "Product B" },
            { value: "prod_3", label: "Product C" }
        ],
        sales_channel: [
            { value: "sc_1", label: "Web Store" },
            { value: "sc_2", label: "Mobile App" },
            { value: "sc_3", label: "Retail" }
        ],
        region: [
            { value: "us-east", label: "US East" },
            { value: "us-west", label: "US West" },
            { value: "eu", label: "Europe" }
        ]
    }

    return mockData[entityType] || []
}

export const ParameterInput = ({
    field,
    value,
    onChange,
}: {
    field: ParameterFieldDefinition
    value: any
    onChange: (value: any) => void
}) => {
    const [entityOptions, setEntityOptions] = useState<Array<{ value: string; label: string }>>([])
    const [isLoadingEntities, setIsLoadingEntities] = useState(false)

    // Load entity options for entity/entities field types
    useState(() => {
        if ((field.fieldType === "entity" || field.fieldType === "entities") && field.entityReference) {
            setIsLoadingEntities(true)
            fetchEntityOptions(field.entityReference.entity)
                .then(setEntityOptions)
                .finally(() => setIsLoadingEntities(false))
        }
    })

    // Boolean
    if (field.fieldType === "boolean") {
        return (
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    {field.description && (
                        <Text className="text-ui-fg-subtle text-xs mt-0.5">{field.description}</Text>
                    )}
                </div>
                <Switch
                    id={field.name}
                    checked={value === true}
                    onCheckedChange={onChange}
                />
            </div>
        )
    }

    // Select
    if (field.fieldType === "select") {
        return (
            <div>
                <Label htmlFor={field.name}>
                    {field.label}
                </Label>
                {field.description && (
                    <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
                )}
                <Select value={value ?? ""} onValueChange={onChange}>
                    <Select.Trigger id={field.name}>
                        <Select.Value placeholder={field.placeholder || `Select ${field.label}`} />
                    </Select.Trigger>
                    <Select.Content>
                        {field.options?.map((option) => (
                            <Select.Item key={String(option.value)} value={String(option.value)}>
                                {option.label}
                            </Select.Item>
                        ))}
                    </Select.Content>
                </Select>
            </div>
        )
    }

    // Multiselect
    if (field.fieldType === "multiselect") {
        const selectedValues = Array.isArray(value) ? value : []
        return (
            <div>
                <Label htmlFor={field.name}>
                    {field.label}
                </Label>
                {field.description && (
                    <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
                )}
                <Select
                    value={selectedValues.join(",")}
                    onValueChange={(val) => onChange(val ? val.split(",") : [])}
                >
                    <Select.Trigger id={field.name}>
                        <Select.Value placeholder={field.placeholder || `Select ${field.label}`}>
                            {selectedValues.length > 0 ? `${selectedValues.length} selected` : null}
                        </Select.Value>
                    </Select.Trigger>
                    <Select.Content>
                        {field.options?.map((option) => (
                            <Select.Item key={String(option.value)} value={String(option.value)}>
                                {option.label}
                            </Select.Item>
                        ))}
                    </Select.Content>
                </Select>
            </div>
        )
    }

    // Entity (single)
    if (field.fieldType === "entity") {
        return (
            <div>
                <Label htmlFor={field.name}>
                    {field.label}
                </Label>
                {field.description && (
                    <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
                )}
                <Select
                    value={value ?? ""}
                    onValueChange={onChange}
                    disabled={isLoadingEntities}
                >
                    <Select.Trigger id={field.name}>
                        <Select.Value placeholder={field.placeholder || `Select ${field.label}`} />
                    </Select.Trigger>
                    <Select.Content>
                        {isLoadingEntities ? (
                            <Select.Item value="___loading___" disabled>Loading...</Select.Item>
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

    // Entities (multiple)
    if (field.fieldType === "entities") {
        const selectedValues = Array.isArray(value) ? value : []
        return (
            <div>
                <Label htmlFor={field.name}>
                    {field.label}
                </Label>
                {field.description && (
                    <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
                )}
                <Select
                    value={selectedValues.join(",")}
                    onValueChange={(val) => onChange(val ? val.split(",").filter(Boolean) : [])}
                    disabled={isLoadingEntities}
                >
                    <Select.Trigger id={field.name}>
                        <Select.Value placeholder={field.placeholder || `Select ${field.label}`}>
                            {selectedValues.length > 0 ? `${selectedValues.length} selected` : null}
                        </Select.Value>
                    </Select.Trigger>
                    <Select.Content>
                        {isLoadingEntities ? (
                            <Select.Item value="___loading___" disabled>Loading...</Select.Item>
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

    // Number
    if (field.fieldType === "number") {
        return (
            <div>
                <Label htmlFor={field.name}>
                    {field.label}
                </Label>
                {field.description && (
                    <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
                )}
                <Input
                    id={field.name}
                    type="number"
                    placeholder={field.placeholder}
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                />
            </div>
        )
    }

    // Currency
    if (field.fieldType === "currency") {
        return (
            <div>
                <Label htmlFor={field.name}>
                    {field.label}
                </Label>
                {field.description && (
                    <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
                )}
                <Input
                    id={field.name}
                    type="number"
                    placeholder={field.placeholder}
                    step="0.01"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
                />
            </div>
        )
    }

    // Date
    if (field.fieldType === "date") {
        const dateValue = value ? new Date(value).toISOString().split('T')[0] : ""
        return (
            <div>
                <Label htmlFor={field.name}>
                    {field.label}
                </Label>
                {field.description && (
                    <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
                )}
                <Input
                    id={field.name}
                    type="date"
                    value={dateValue}
                    onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
            </div>
        )
    }

    // Date Range
    if (field.fieldType === "daterange") {
        const rangeValue = value || { start: "", end: "" }
        return (
            <div>
                <Label htmlFor={field.name}>
                    {field.label}
                </Label>
                {field.description && (
                    <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
                )}
                <div className="flex gap-2">
                    <Input
                        type="date"
                        placeholder="Start date"
                        value={rangeValue.start ? new Date(rangeValue.start).toISOString().split('T')[0] : ""}
                        onChange={(e) => onChange({
                            ...rangeValue,
                            start: e.target.value ? new Date(e.target.value).toISOString() : null
                        })}
                    />
                    <Input
                        type="date"
                        placeholder="End date"
                        value={rangeValue.end ? new Date(rangeValue.end).toISOString().split('T')[0] : ""}
                        onChange={(e) => onChange({
                            ...rangeValue,
                            end: e.target.value ? new Date(e.target.value).toISOString() : null
                        })}
                    />
                </div>
            </div>
        )
    }

    // JSON
    if (field.fieldType === "json") {
        return (
            <div>
                <Label htmlFor={field.name}>
                    {field.label}
                </Label>
                {field.description && (
                    <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
                )}
                <Textarea
                    id={field.name}
                    placeholder={field.placeholder}
                    value={typeof value === "object" ? JSON.stringify(value, null, 2) : value ?? ""}
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
    }

    // Custom - render as text with note
    if (field.fieldType === "custom") {
        return (
            <div>
                <Label htmlFor={field.name}>
                    {field.label}
                </Label>
                {field.description && (
                    <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
                )}
                <Text className="text-ui-fg-warning text-xs mb-1">Custom field type - using text input</Text>
                <Input
                    id={field.name}
                    type="text"
                    placeholder={field.placeholder}
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value || null)}
                />
            </div>
        )
    }

    // Default to text input
    return (
        <div>
            <Label htmlFor={field.name}>
                {field.label}
            </Label>
            {field.description && (
                <Text className="text-ui-fg-subtle text-xs mt-0.5 mb-1">{field.description}</Text>
            )}
            <Input
                id={field.name}
                type="text"
                placeholder={field.placeholder}
                value={value ?? ""}
                onChange={(e) => onChange(e.target.value || null)}
            />
        </div>
    )
}
