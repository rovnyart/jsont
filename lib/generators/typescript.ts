/**
 * TypeScript Interface/Type Generator
 * Generates TypeScript types from JSON data
 */

export interface TypeScriptOptions {
  /** Use 'interface' or 'type' keyword */
  style: "interface" | "type";
  /** Root type name */
  rootName: string;
  /** Make all fields optional */
  allOptional: boolean;
  /** Add export keyword */
  exportTypes: boolean;
  /** Use readonly modifier for properties */
  readonlyProps: boolean;
}

export const defaultTypeScriptOptions: TypeScriptOptions = {
  style: "interface",
  rootName: "Root",
  allOptional: false,
  exportTypes: true,
  readonlyProps: false,
};

type JsonValueType = "string" | "number" | "boolean" | "null" | "array" | "object" | "unknown";

interface TypeInfo {
  name: string;
  definition: string;
}

/**
 * Convert a string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (c) => c.toUpperCase());
}

/**
 * Make a valid TypeScript identifier
 */
function toValidIdentifier(str: string): string {
  // Remove invalid characters and convert to PascalCase
  const cleaned = str.replace(/[^a-zA-Z0-9_$]/g, "_");
  return toPascalCase(cleaned);
}

/**
 * Check if a key needs quotes in TypeScript
 */
function needsQuotes(key: string): boolean {
  return !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}

/**
 * Format a property key
 */
function formatKey(key: string): string {
  return needsQuotes(key) ? `"${key}"` : key;
}

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
 * Generate TypeScript type for a value
 */
function generateType(
  value: unknown,
  name: string,
  options: TypeScriptOptions,
  types: Map<string, TypeInfo>,
  depth: number = 0,
  indent: number = 0
): string {
  const type = inferType(value);

  switch (type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "unknown":
      return "unknown";

    case "array": {
      const arr = value as unknown[];
      if (arr.length === 0) {
        return "unknown[]";
      }

      // Analyze all array items to find common type
      const itemTypes = new Set<string>();
      let hasObject = false;
      let objectShape: Record<string, unknown> | null = null;

      for (const item of arr) {
        const itemType = inferType(item);
        if (itemType === "object") {
          hasObject = true;
          // Merge object shapes
          if (objectShape === null) {
            objectShape = { ...(item as Record<string, unknown>) };
          } else {
            // Merge keys
            for (const key of Object.keys(item as Record<string, unknown>)) {
              if (!(key in objectShape)) {
                objectShape[key] = (item as Record<string, unknown>)[key];
              }
            }
          }
        } else {
          itemTypes.add(generateType(item, `${name}Item`, options, types, depth + 1, indent));
        }
      }

      if (hasObject && objectShape) {
        const itemTypeName = `${name}Item`;
        const itemTypeStr = generateType(objectShape, itemTypeName, options, types, depth + 1, indent);
        itemTypes.add(itemTypeStr);
      }

      const typeArray = Array.from(itemTypes);
      if (typeArray.length === 0) {
        return "unknown[]";
      } else if (typeArray.length === 1) {
        return `${typeArray[0]}[]`;
      } else {
        return `(${typeArray.join(" | ")})[]`;
      }
    }

    case "object": {
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj);

      if (keys.length === 0) {
        return "Record<string, unknown>";
      }

      // For nested objects, create a named type
      const typeName = toValidIdentifier(name);

      // Check if we already have this type
      if (types.has(typeName) && depth > 0) {
        return typeName;
      }

      const readonly = options.readonlyProps ? "readonly " : "";
      const optional = options.allOptional ? "?" : "";

      // Only create named types for root and direct properties
      if (depth === 0 || depth === 1) {
        const props: string[] = [];

        for (const key of keys) {
          const propValue = obj[key];
          const propName = toPascalCase(key);
          const propType = generateType(propValue, `${typeName}${propName}`, options, types, depth + 1, 1);
          const formattedKey = formatKey(key);
          props.push(`  ${readonly}${formattedKey}${optional}: ${propType};`);
        }

        const exportKeyword = options.exportTypes ? "export " : "";

        if (options.style === "interface") {
          const definition = `${exportKeyword}interface ${typeName} {\n${props.join("\n")}\n}`;
          types.set(typeName, { name: typeName, definition });
        } else {
          const definition = `${exportKeyword}type ${typeName} = {\n${props.join("\n")}\n};`;
          types.set(typeName, { name: typeName, definition });
        }

        return typeName;
      }

      // For deeper nesting, inline the type with proper indentation
      const baseIndent = "  ".repeat(indent);
      const propIndent = "  ".repeat(indent + 1);
      const props: string[] = [];

      for (const key of keys) {
        const propValue = obj[key];
        const propName = toPascalCase(key);
        const propType = generateType(propValue, `${typeName}${propName}`, options, types, depth + 1, indent + 1);
        const formattedKey = formatKey(key);
        props.push(`${propIndent}${readonly}${formattedKey}${optional}: ${propType};`);
      }

      return `{\n${props.join("\n")}\n${baseIndent}}`;
    }

    default:
      return "unknown";
  }
}

/**
 * Generate TypeScript interfaces/types from JSON data
 */
export function generateTypeScript(
  data: unknown,
  options: Partial<TypeScriptOptions> = {}
): string {
  const fullOptions: TypeScriptOptions = { ...defaultTypeScriptOptions, ...options };
  const types = new Map<string, TypeInfo>();

  // Generate the root type
  generateType(data, fullOptions.rootName, fullOptions, types, 0);

  // Collect all type definitions
  const definitions: string[] = [];

  // Add types in order (nested types first, then root)
  const rootTypeName = toValidIdentifier(fullOptions.rootName);
  const sortedTypes = Array.from(types.values()).sort((a, b) => {
    if (a.name === rootTypeName) return 1;
    if (b.name === rootTypeName) return -1;
    return a.name.localeCompare(b.name);
  });

  for (const typeInfo of sortedTypes) {
    definitions.push(typeInfo.definition);
  }

  return definitions.join("\n\n");
}

/**
 * Validate that input can be used to generate types
 */
export function canGenerateTypeScript(data: unknown): boolean {
  return data !== null && data !== undefined;
}
