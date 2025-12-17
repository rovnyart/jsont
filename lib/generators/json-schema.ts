/**
 * JSON Schema Generator
 * Generates JSON Schema draft-07 from JSON data
 */

export interface JsonSchemaOptions {
  /** Make all fields required (default: true) */
  allRequired: boolean;
  /** Add additionalProperties: false to objects (default: false) */
  strictMode: boolean;
  /** Include example values from source (default: false) */
  includeExamples: boolean;
  /** Title for the root schema */
  title?: string;
  /** Description for the root schema */
  description?: string;
}

export const defaultSchemaOptions: JsonSchemaOptions = {
  allRequired: true,
  strictMode: false,
  includeExamples: false,
};

type JsonSchemaType = "string" | "number" | "integer" | "boolean" | "null" | "array" | "object";

interface JsonSchema {
  $schema?: string;
  title?: string;
  description?: string;
  type?: JsonSchemaType | JsonSchemaType[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  additionalProperties?: boolean;
  examples?: unknown[];
  enum?: unknown[];
  // For union types when we see null
  anyOf?: JsonSchema[];
}

/**
 * Infer the JSON Schema type from a JavaScript value
 */
function inferType(value: unknown): JsonSchemaType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";

  const jsType = typeof value;
  switch (jsType) {
    case "string": return "string";
    case "number": return Number.isInteger(value) ? "integer" : "number";
    case "boolean": return "boolean";
    case "object": return "object";
    default: return "string";
  }
}

/**
 * Generate schema for an array by analyzing all items
 */
function generateArraySchema(arr: unknown[], options: JsonSchemaOptions): JsonSchema {
  if (arr.length === 0) {
    return { type: "array", items: {} };
  }

  // Collect schemas for all items
  const itemSchemas = arr.map(item => generateSchema(item, options, false));

  // If all items have the same structure, use that
  // For simplicity, we'll merge all schemas into one
  const mergedSchema = mergeSchemas(itemSchemas, options);

  const schema: JsonSchema = {
    type: "array",
    items: mergedSchema,
  };

  return schema;
}

/**
 * Merge multiple schemas into one (for array items)
 */
function mergeSchemas(schemas: JsonSchema[], options: JsonSchemaOptions): JsonSchema {
  if (schemas.length === 0) return {};
  if (schemas.length === 1) return schemas[0];

  // Collect all unique types
  const types = new Set<JsonSchemaType>();
  const allProperties: Record<string, JsonSchema[]> = {};
  const examples: unknown[] = [];

  for (const schema of schemas) {
    // Handle type
    if (schema.type) {
      if (Array.isArray(schema.type)) {
        schema.type.forEach(t => types.add(t));
      } else {
        types.add(schema.type);
      }
    }

    // Collect properties for objects
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (!allProperties[key]) {
          allProperties[key] = [];
        }
        allProperties[key].push(propSchema);
      }
    }

    // Collect examples
    if (schema.examples) {
      examples.push(...schema.examples);
    }
  }

  // Build merged schema
  const merged: JsonSchema = {};

  // Set type(s)
  const typeArray = Array.from(types);
  if (typeArray.length === 1) {
    merged.type = typeArray[0];
  } else if (typeArray.length > 1) {
    // Use anyOf for mixed types
    merged.anyOf = typeArray.map(t => ({ type: t }));
  }

  // Merge properties if we have objects
  if (Object.keys(allProperties).length > 0) {
    merged.type = "object";
    delete merged.anyOf;
    merged.properties = {};

    for (const [key, propSchemas] of Object.entries(allProperties)) {
      merged.properties[key] = mergeSchemas(propSchemas, options);
    }

    // Only require fields that appear in ALL items
    if (options.allRequired) {
      const requiredFields = Object.keys(allProperties).filter(key =>
        allProperties[key].length === schemas.length
      );
      if (requiredFields.length > 0) {
        merged.required = requiredFields.sort();
      }
    }

    if (options.strictMode) {
      merged.additionalProperties = false;
    }
  }

  // Add examples
  if (options.includeExamples && examples.length > 0) {
    // Dedupe and limit examples
    const uniqueExamples = [...new Set(examples.map(e => JSON.stringify(e)))]
      .slice(0, 3)
      .map(e => JSON.parse(e));
    if (uniqueExamples.length > 0) {
      merged.examples = uniqueExamples;
    }
  }

  return merged;
}

/**
 * Generate schema for an object
 */
function generateObjectSchema(obj: Record<string, unknown>, options: JsonSchemaOptions): JsonSchema {
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    properties[key] = generateSchema(value, options, false);

    if (options.allRequired && value !== null) {
      required.push(key);
    }
  }

  const schema: JsonSchema = {
    type: "object",
    properties,
  };

  if (required.length > 0) {
    schema.required = required.sort();
  }

  if (options.strictMode) {
    schema.additionalProperties = false;
  }

  return schema;
}

/**
 * Generate JSON Schema from a value
 */
function generateSchema(value: unknown, options: JsonSchemaOptions, isRoot: boolean): JsonSchema {
  const type = inferType(value);

  let schema: JsonSchema;

  switch (type) {
    case "array":
      schema = generateArraySchema(value as unknown[], options);
      break;
    case "object":
      schema = generateObjectSchema(value as Record<string, unknown>, options);
      break;
    case "null":
      schema = { type: "null" };
      break;
    default:
      schema = { type };
      if (options.includeExamples && value !== null && value !== undefined) {
        schema.examples = [value];
      }
      break;
  }

  // Add root-level properties
  if (isRoot) {
    schema.$schema = "http://json-schema.org/draft-07/schema#";
    if (options.title) {
      schema.title = options.title;
    }
    if (options.description) {
      schema.description = options.description;
    }
  }

  return schema;
}

/**
 * Generate JSON Schema from JSON data
 */
export function generateJsonSchema(
  data: unknown,
  options: Partial<JsonSchemaOptions> = {}
): string {
  const fullOptions: JsonSchemaOptions = { ...defaultSchemaOptions, ...options };
  const schema = generateSchema(data, fullOptions, true);
  return JSON.stringify(schema, null, 2);
}

/**
 * Validate that input can be used to generate a schema
 */
export function canGenerateSchema(data: unknown): boolean {
  return data !== null && data !== undefined;
}
