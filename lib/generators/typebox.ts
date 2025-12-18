/**
 * TypeBox Schema Generator
 * Generates TypeBox schemas from JSON data
 * @sinclair/typebox - JSON Schema Type Builder
 */

export interface TypeBoxOptions {
  /** Use Type.Optional() for nullable fields */
  useOptional: boolean;
  /** Add format validations (email, uri, uuid, date-time) */
  detectFormats: boolean;
  /** Use Type.Integer() for whole numbers */
  useInteger: boolean;
  /** Export as const (for static type inference) */
  exportConst: boolean;
  /** Schema name */
  schemaName: string;
}

export const defaultTypeBoxOptions: TypeBoxOptions = {
  useOptional: false,
  detectFormats: true,
  useInteger: true,
  exportConst: true,
  schemaName: "Schema",
};

/**
 * Check if a string looks like an ISO date
 */
function isISODateString(value: string): boolean {
  const isoPatterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?[+-]\d{2}:\d{2}$/,
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
 * Generate TypeBox schema string for a value
 */
function generateTypeBoxType(
  value: unknown,
  options: TypeBoxOptions,
  indent: number = 0
): string {
  const type = inferType(value);
  const spaces = "  ".repeat(indent);

  switch (type) {
    case "null":
      return "Type.Null()";

    case "boolean":
      return "Type.Boolean()";

    case "number": {
      const num = value as number;
      if (options.useInteger && Number.isInteger(num)) {
        return "Type.Integer()";
      }
      return "Type.Number()";
    }

    case "string": {
      const str = value as string;
      if (options.detectFormats) {
        if (isISODateString(str)) {
          return 'Type.String({ format: "date-time" })';
        }
        if (isEmailString(str)) {
          return 'Type.String({ format: "email" })';
        }
        if (isURLString(str)) {
          return 'Type.String({ format: "uri" })';
        }
        if (isUUIDString(str)) {
          return 'Type.String({ format: "uuid" })';
        }
      }
      return "Type.String()";
    }

    case "array": {
      const arr = value as unknown[];
      if (arr.length === 0) {
        return "Type.Array(Type.Unknown())";
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
          itemTypes.add(itemType);
        }
      }

      // Generate item schema
      let itemSchema: string;
      if (mergedObject !== null) {
        itemSchema = generateTypeBoxType(mergedObject, options, indent);
      } else {
        const cleanTypes = Array.from(itemTypes);
        if (cleanTypes.length === 0) {
          itemSchema = "Type.String()";
        } else if (cleanTypes.length === 1) {
          const sampleItem = arr.find(item => inferType(item) === cleanTypes[0]);
          itemSchema = generateTypeBoxType(sampleItem, options, indent);
        } else {
          // Union type
          const schemas = cleanTypes.map(t => {
            const sample = arr.find(item => inferType(item) === t);
            return generateTypeBoxType(sample, options, indent);
          });
          itemSchema = `Type.Union([${schemas.join(", ")}])`;
        }
      }

      // Handle nullable items
      if (hasNull) {
        itemSchema = `Type.Union([${itemSchema}, Type.Null()])`;
      }

      return `Type.Array(${itemSchema})`;
    }

    case "object": {
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj);

      if (keys.length === 0) {
        return "Type.Record(Type.String(), Type.Unknown())";
      }

      const props: string[] = [];
      for (const key of keys) {
        const propValue = obj[key];
        let propSchema = generateTypeBoxType(propValue, options, indent + 1);

        // Handle null values
        if (propValue === null) {
          if (options.useOptional) {
            propSchema = "Type.Optional(Type.Unknown())";
          } else {
            propSchema = "Type.Union([Type.Unknown(), Type.Null()])";
          }
        }

        // Format key (quote if needed)
        const formattedKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;
        props.push(`${spaces}  ${formattedKey}: ${propSchema}`);
      }

      return `Type.Object({\n${props.join(",\n")},\n${spaces}})`;
    }

    default:
      return "Type.Unknown()";
  }
}

/**
 * Generate TypeBox schema from JSON data
 */
export function generateTypeBox(
  data: unknown,
  options: Partial<TypeBoxOptions> = {}
): string {
  const fullOptions: TypeBoxOptions = { ...defaultTypeBoxOptions, ...options };

  const schemaBody = generateTypeBoxType(data, fullOptions, 0);
  const schemaName = fullOptions.schemaName || "Schema";

  // Build the output with import
  const lines: string[] = [
    'import { Type, Static } from "@sinclair/typebox";',
    '',
  ];

  if (fullOptions.exportConst) {
    lines.push(`export const ${schemaName} = ${schemaBody};`);
  } else {
    lines.push(`const ${schemaName} = ${schemaBody};`);
  }

  lines.push('');
  lines.push('// Inferred type');
  lines.push(`export type ${schemaName}Type = Static<typeof ${schemaName}>;`);

  return lines.join('\n');
}

/**
 * Validate that input can be used to generate TypeBox schema
 */
export function canGenerateTypeBox(data: unknown): boolean {
  return data !== null && data !== undefined;
}
