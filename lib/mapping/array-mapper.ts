/**
 * Array Mapping Utilities
 *
 * Provides functions to map arrays of objects by selecting and renaming fields.
 */

export interface FieldMapping {
  /** Original field name */
  source: string;
  /** Target field name (if different from source) */
  target: string;
  /** Whether this field is included in output */
  selected: boolean;
}

export interface MappingConfig {
  fields: FieldMapping[];
}

/**
 * Check if data is an array of objects (mappable)
 */
export function isMappableArray(data: unknown): data is Record<string, unknown>[] {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }
  // Check if at least the first item is an object
  const first = data[0];
  return typeof first === "object" && first !== null && !Array.isArray(first);
}

/**
 * Extract all unique field names from an array of objects
 * Handles nested objects by flattening with dot notation
 */
export function extractFields(
  data: Record<string, unknown>[],
  options: { maxDepth?: number; flattenNested?: boolean } = {}
): string[] {
  const { maxDepth = 1, flattenNested = false } = options;
  const fields = new Set<string>();

  const extractFromObject = (obj: Record<string, unknown>, prefix = "", depth = 0) => {
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (
        flattenNested &&
        depth < maxDepth &&
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Recurse into nested objects
        extractFromObject(value as Record<string, unknown>, fullKey, depth + 1);
      } else {
        fields.add(fullKey);
      }
    }
  };

  // Sample multiple items to get all possible fields
  const sampleSize = Math.min(data.length, 10);
  for (let i = 0; i < sampleSize; i++) {
    extractFromObject(data[i]);
  }

  return Array.from(fields).sort();
}

/**
 * Create initial mapping config with all fields selected
 */
export function createInitialMapping(fields: string[]): MappingConfig {
  return {
    fields: fields.map((field) => ({
      source: field,
      target: field,
      selected: true,
    })),
  };
}

/**
 * Get value from object using dot notation path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Apply mapping config to transform array data
 */
export function applyMapping(
  data: Record<string, unknown>[],
  config: MappingConfig
): Record<string, unknown>[] {
  const selectedFields = config.fields.filter((f) => f.selected);

  return data.map((item) => {
    const result: Record<string, unknown> = {};

    for (const field of selectedFields) {
      const value = getNestedValue(item, field.source);
      result[field.target] = value;
    }

    return result;
  });
}

/**
 * Generate JavaScript .map() code for the mapping
 */
export function generateMapCode(config: MappingConfig): string {
  const selectedFields = config.fields.filter((f) => f.selected);

  if (selectedFields.length === 0) {
    return "data.map(() => ({}))";
  }

  const fieldMappings = selectedFields.map((f) => {
    const sourceAccess = f.source.includes(".")
      ? `item${f.source.split(".").map((p) => `["${p}"]`).join("")}`
      : `item.${f.source}`;

    if (f.source === f.target) {
      // Shorthand if names are the same
      return `  ${f.target}: ${sourceAccess}`;
    }
    return `  ${f.target}: ${sourceAccess}`;
  });

  return `data.map((item) => ({
${fieldMappings.join(",\n")}
}))`;
}

/**
 * Generate TypeScript .map() code with types
 */
export function generateMapCodeTS(
  config: MappingConfig,
  data: Record<string, unknown>[]
): string {
  const selectedFields = config.fields.filter((f) => f.selected);

  if (selectedFields.length === 0) {
    return "data.map(() => ({}))";
  }

  // Infer types from sample data
  const inferType = (value: unknown): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (Array.isArray(value)) return "unknown[]";
    if (typeof value === "object") return "Record<string, unknown>";
    return typeof value;
  };

  // Build output type
  const typeFields = selectedFields.map((f) => {
    const sampleValue = data[0] ? getNestedValue(data[0], f.source) : undefined;
    const type = inferType(sampleValue);
    return `  ${f.target}: ${type};`;
  });

  const outputType = `{\n${typeFields.join("\n")}\n}`;

  const fieldMappings = selectedFields.map((f) => {
    const sourceAccess = f.source.includes(".")
      ? `item${f.source.split(".").map((p) => `["${p}"]`).join("")}`
      : `item.${f.source}`;

    return `  ${f.target}: ${sourceAccess}`;
  });

  return `type MappedItem = ${outputType};

const result: MappedItem[] = data.map((item): MappedItem => ({
${fieldMappings.join(",\n")}
}));`;
}
