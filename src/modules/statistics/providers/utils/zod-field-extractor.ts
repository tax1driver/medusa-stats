import { z } from "zod";

export function extractFieldsFromZodSchema(schema: z.ZodObject<any>): Array<{
    name: string;
    type: string;
    metadata: Record<string, any>;
}> {
    const shape = (schema as any).shape as Record<string, z.ZodType<any>>;
    if (!shape) return [];

    return Object.entries(shape).map(([name, zodType]) => {
        let inner = zodType;
        let defaultValue: any = undefined;
        let isOptional = false;

        if (inner instanceof z.ZodDefault) {
            inner = (inner as z.ZodDefault<any>).removeDefault();
        }
        if (inner instanceof z.ZodOptional) {
            isOptional = true;
            inner = (inner as z.ZodOptional<any>).unwrap();
        }

        const userMeta: Record<string, any> = inner.meta() || {};

        let enumOptions: string[] | undefined;


        let type = "string";
        if (inner instanceof z.ZodNumber) type = "number";
        else if (inner instanceof z.ZodBoolean) type = "boolean";
        else if (inner instanceof z.ZodEnum) {
            type = "enum";
            enumOptions = inner.options?.map((opt: any) => String(opt));
        } else if (inner instanceof z.ZodArray) {
            const elementType = (inner as z.ZodArray<any>).element;
            if (elementType instanceof z.ZodEnum) {
                type = "array";
                enumOptions = elementType.options?.map((opt: any) => String(opt));
            } else {
                type = "array";
            }
        } else if (inner instanceof z.ZodDate) type = "date";
        else if (inner instanceof z.ZodString) type = "string";

        if (userMeta.type) type = userMeta.type;

        const metadata: Record<string, any> = { ...userMeta };

        if (!metadata.label) metadata.label = name;
        if (defaultValue !== undefined) metadata.default = defaultValue;
        if (isOptional) metadata.optional = true;
        if (enumOptions) metadata.options = enumOptions;

        return { name, type, metadata };
    });
}
