/**
 * Zod Schema Generator
 * Generates Zod schemas from JSON data
 */

export interface ZodOptions {
  /** Use nullable() instead of union with null */
  useNullable: boolean;
  /** Use strict() for objects (no unknown keys) */
  strictMode: boolean;
  /** Try to detect date strings and use z.string().datetime() */
  detectDates: boolean;
  /** Try to detect enums from repeated values in arrays */
  detectEnums: boolean;
  /** Add .describe() with field names */
  addDescriptions: boolean;
}

export const defaultZodOptions: ZodOptions = {
  useNullable: true,
  strictMode: false,
  detectDates: true,
  detectEnums: false,
  addDescriptions: false,
};

/**
 * Check if a string looks like an ISO date
 */
function isISODateString(value: string): boolean {
  // ISO 8601 date patterns
  const isoPatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // 2024-01-15
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // 2024-01-15T10:30:00
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, // with milliseconds and Z
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?[+-]\d{2}:\d{2}$/, // with timezone
  ];
  return isoPatterns.some(pattern => pattern.test(value));
}

/**
 * Check if a string looks like a URL
 */
function isURLString(value: string): boolean {
  return /^https?:\/\//.test(value);
}

/**
 * Check if a string looks like an email
 */
function isEmailString(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Check if a string looks like a UUID
 */
function isUUIDString(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

type JsonValueType = "string" | "number" | "boolean" | "null" | "array" | "object" | "unknown";

/**
 * Infer the type of a value
 */
function inferType(value: unknown): JsonValueType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const jsType = typeof value;
  switch (jsType) {
    case "string": return "string";
    case "number": return "number";
    case "boolean": return "boolean";
    case "object": return "object";
    default: return "unknown";
  }
}

/**
 * Generate Zod schema string for a value
 */
function generateZodType(
  value: unknown,
  options: ZodOptions,
  indent: number = 0
): string {
  const type = inferType(value);
  const spaces = "  ".repeat(indent);

  switch (type) {
    case "null":
      return "z.null()";

    case "boolean":
      return "z.boolean()";

    case "number": {
      const num = value as number;
      if (Number.isInteger(num)) {
        return "z.number().int()";
      }
      return "z.number()";
    }

    case "string": {
      const str = value as string;
      if (options.detectDates && isISODateString(str)) {
        return "z.string().datetime()";
      }
      if (isEmailString(str)) {
        return "z.string().email()";
      }
      if (isURLString(str)) {
        return "z.string().url()";
      }
      if (isUUIDString(str)) {
        return "z.string().uuid()";
      }
      return "z.string()";
    }

    case "array": {
      const arr = value as unknown[];
      if (arr.length === 0) {
        return "z.array(z.unknown())";
      }

      // Check if all items have the same structure
      const itemTypes = new Set<string>();
      let mergedObject: Record<string, unknown> | null = null;
      let hasNull = false;

      for (const item of arr) {
        const itemType = inferType(item);
        if (itemType === "null") {
          hasNull = true;
          continue;
        }
        if (itemType === "object") {
          // Merge object shapes
          if (mergedObject === null) {
            mergedObject = { ...(item as Record<string, unknown>) };
          } else {
            for (const key of Object.keys(item as Record<string, unknown>)) {
              if (!(key in mergedObject)) {
                mergedObject[key] = (item as Record<string, unknown>)[key];
              }
            }
          }
          itemTypes.add("object");
        } else {
          // Check for enum detection
          if (options.detectEnums && itemType === "string") {
            itemTypes.add(`string:${item}`);
          } else {
            itemTypes.add(itemType);
          }
        }
      }

      // Check if we have enum values
      const stringValues = Array.from(itemTypes).filter(t => t.startsWith("string:"));
      if (options.detectEnums && stringValues.length > 1 && stringValues.length <= 10) {
        const enumValues = stringValues.map(t => t.replace("string:", ""));
        const enumSchema = `z.enum([${enumValues.map(v => `"${v}"`).join(", ")}])`;
        return `z.array(${enumSchema})`;
      }

      // Generate item schema
      let itemSchema: string;
      if (mergedObject !== null) {
        itemSchema = generateZodType(mergedObject, options, indent);
      } else {
        const cleanTypes = Array.from(itemTypes).filter(t => !t.startsWith("string:"));
        if (cleanTypes.length === 0) {
          itemSchema = "z.string()";
        } else if (cleanTypes.length === 1) {
          // Single type
          const sampleItem = arr.find(item => inferType(item) === cleanTypes[0]);
          itemSchema = generateZodType(sampleItem, options, indent);
        } else {
          // Union type
          const schemas = cleanTypes.map(t => {
            const sample = arr.find(item => inferType(item) === t);
            return generateZodType(sample, options, indent);
          });
          itemSchema = `z.union([${schemas.join(", ")}])`;
        }
      }

      // Handle nullable items
      if (hasNull) {
        if (options.useNullable) {
          itemSchema = `${itemSchema}.nullable()`;
        } else {
          itemSchema = `z.union([${itemSchema}, z.null()])`;
        }
      }

      return `z.array(${itemSchema})`;
    }

    case "object": {
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj);

      if (keys.length === 0) {
        return "z.record(z.string(), z.unknown())";
      }

      const props: string[] = [];
      for (const key of keys) {
        const propValue = obj[key];
        const propSchema = generateZodType(propValue, options, indent + 1);

        // Handle null values
        let finalSchema = propSchema;
        if (propValue === null) {
          if (options.useNullable) {
            finalSchema = "z.unknown().nullable()";
          } else {
            finalSchema = "z.union([z.unknown(), z.null()])";
          }
        }

        // Format key (quote if needed)
        const formattedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;

        if (options.addDescriptions) {
          props.push(`${spaces}  ${formattedKey}: ${finalSchema}.describe("${key}")`);
        } else {
          props.push(`${spaces}  ${formattedKey}: ${finalSchema}`);
        }
      }

      const objectContent = `z.object({\n${props.join(",\n")},\n${spaces}})`;

      if (options.strictMode) {
        return `${objectContent}.strict()`;
      }

      return objectContent;
    }

    default:
      return "z.unknown()";
  }
}

/**
 * Generate Zod schema from JSON data
 */
export function generateZod(
  data: unknown,
  options: Partial<ZodOptions> = {}
): string {
  const fullOptions: ZodOptions = { ...defaultZodOptions, ...options };

  const schemaBody = generateZodType(data, fullOptions, 0);

  // Build the output with import
  const lines: string[] = [
    'import { z } from "zod";',
    '',
    `export const schema = ${schemaBody};`,
    '',
    '// Inferred type',
    'export type Schema = z.infer<typeof schema>;',
  ];

  return lines.join('\n');
}

/**
 * Validate that input can be used to generate Zod schema
 */
export function canGenerateZod(data: unknown): boolean {
  return data !== null && data !== undefined;
}
