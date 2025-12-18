/**
 * JSONPath autocomplete utilities
 * Provides context-aware suggestions for JSONPath queries
 */

export interface Suggestion {
  value: string; // What to insert
  label: string; // Display text
  description?: string; // Optional description
  type: "property" | "index" | "wildcard" | "operator" | "filter";
}

/**
 * Get the value at a JSONPath-like location in the data
 */
function getValueAtPath(data: unknown, pathParts: string[]): unknown {
  let current: unknown = data;

  for (const part of pathParts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (part === "$") {
      continue;
    }

    // Handle array index like [0] or [*]
    const indexMatch = part.match(/^\[(\d+)\]$/);
    if (indexMatch) {
      if (Array.isArray(current)) {
        const index = parseInt(indexMatch[1], 10);
        current = current[index];
        continue;
      }
      return undefined;
    }

    // Handle wildcard [*] - return first element for suggestion context
    if (part === "[*]") {
      if (Array.isArray(current) && current.length > 0) {
        current = current[0];
        continue;
      }
      return undefined;
    }

    // Handle property access
    if (typeof current === "object" && current !== null && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[part];
      continue;
    }

    return undefined;
  }

  return current;
}

/**
 * Parse a partial JSONPath query into parts
 * Examples:
 *   "$.store" -> ["$", "store"]
 *   "$.store.books[0]" -> ["$", "store", "books", "[0]"]
 *   "$.store." -> ["$", "store", ""] (trailing dot means expecting property)
 */
function parsePartialPath(query: string): { parts: string[]; isComplete: boolean; lastPart: string } {
  if (!query || query === "$") {
    return { parts: ["$"], isComplete: true, lastPart: "$" };
  }

  const parts: string[] = ["$"];
  let remaining = query.startsWith("$.") ? query.slice(2) : query.startsWith("$") ? query.slice(1) : query;

  // Check if query ends with a dot or bracket (expecting more input)
  const endsWithDot = remaining.endsWith(".");
  const endsWithOpenBracket = remaining.endsWith("[");

  if (endsWithDot) {
    remaining = remaining.slice(0, -1);
  }

  // Parse the path
  let current = "";
  let inBracket = false;

  for (let i = 0; i < remaining.length; i++) {
    const char = remaining[i];

    if (char === "[") {
      if (current) {
        parts.push(current);
        current = "";
      }
      inBracket = true;
      current = "[";
    } else if (char === "]") {
      current += "]";
      parts.push(current);
      current = "";
      inBracket = false;
    } else if (char === "." && !inBracket) {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  // If ends with dot, add empty string to indicate expecting property
  if (endsWithDot) {
    parts.push("");
  }

  // If ends with open bracket, add "[" to indicate expecting index
  if (endsWithOpenBracket && !parts[parts.length - 1]?.startsWith("[")) {
    parts.push("[");
  }

  const lastPart = parts[parts.length - 1] || "";
  const isComplete = !endsWithDot && !endsWithOpenBracket && !lastPart.startsWith("[");

  return { parts, isComplete, lastPart };
}

/**
 * Check if we're inside a filter expression and extract context
 * e.g., "$.departments[?(@.bud" -> { arrayPath: "$.departments", filterPrefix: "bud", needsClose: false }
 */
interface FilterContext {
  arrayPath: string;
  filterPrefix: string;
  inFilter: boolean;
  needsClose: boolean; // true when we have a complete comparison and need )]
}

function parseFilterContext(query: string): FilterContext {
  // Check if we have a complete comparison that needs closing
  // Match: path[?(@.prop op value  (where value is number, string, or boolean)
  const needsCloseMatch = query.match(/^(.+?)\[\?\(@\.[a-zA-Z0-9_$]+(>|<|>=|<=|==|!=)\s*("[^"]*"|'[^']*'|\d+\.?\d*|true|false)$/);
  if (needsCloseMatch) {
    return {
      arrayPath: needsCloseMatch[1],
      filterPrefix: "",
      inFilter: true,
      needsClose: true,
    };
  }

  // Match pattern like: path[?(@.prefix or path[?(@.prop > or path[?(@.prop == "val" && @.
  const filterMatch = query.match(/^(.+?)\[\?\(@\.([a-zA-Z0-9_$]*)$/);
  if (filterMatch) {
    return {
      arrayPath: filterMatch[1],
      filterPrefix: filterMatch[2],
      inFilter: true,
      needsClose: false,
    };
  }

  // Also match after comparison operators: path[?(@.prop > 5 && @.
  const filterContinueMatch = query.match(/^(.+?)\[\?\(.*@\.([a-zA-Z0-9_$]*)$/);
  if (filterContinueMatch) {
    return {
      arrayPath: filterContinueMatch[1],
      filterPrefix: filterContinueMatch[2],
      inFilter: true,
      needsClose: false,
    };
  }

  return { arrayPath: "", filterPrefix: "", inFilter: false, needsClose: false };
}

/**
 * Generate suggestions based on current query and data
 */
export function getSuggestions(data: unknown, query: string): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (!query || query === "") {
    // Starting fresh - suggest root
    suggestions.push({
      value: "$",
      label: "$",
      description: "Root object",
      type: "operator",
    });
    return suggestions;
  }

  // Check if we're inside a filter expression
  const filterContext = parseFilterContext(query);
  if (filterContext.inFilter) {
    if (filterContext.needsClose) {
      // Suggest closing the filter expression
      return [
        {
          value: ")]",
          label: ")]",
          description: "Close filter",
          type: "operator" as const,
        },
        {
          value: " && @.",
          label: "&& @.",
          description: "Add another condition",
          type: "operator" as const,
        },
        {
          value: " || @.",
          label: "|| @.",
          description: "Or another condition",
          type: "operator" as const,
        },
      ];
    }
    return getFilterSuggestions(data, filterContext.arrayPath, filterContext.filterPrefix);
  }

  const { parts, lastPart } = parsePartialPath(query);

  // Get the path to navigate to (excluding the last incomplete part)
  const contextParts = lastPart === "" || lastPart.startsWith("[")
    ? parts.slice(0, -1)
    : parts.slice(0, -1);

  // Special case: if we're at root level
  if (contextParts.length === 0 || (contextParts.length === 1 && contextParts[0] === "$")) {
    const contextValue = data;

    if (lastPart === "" || lastPart === "$") {
      // After $ or $. - suggest properties
      return getPropertySuggestions(contextValue, "");
    }

    // Partial property name at root
    if (!lastPart.startsWith("[")) {
      return getPropertySuggestions(contextValue, lastPart);
    }
  }

  // Navigate to the context
  const contextValue = getValueAtPath(data, contextParts);

  if (contextValue === undefined) {
    return suggestions;
  }

  // Determine what kind of suggestions to provide
  if (lastPart === "") {
    // After a dot - suggest properties
    return getPropertySuggestions(contextValue, "");
  }

  if (lastPart === "[" || lastPart.startsWith("[")) {
    // Inside brackets - suggest indices or wildcards
    return getBracketSuggestions(contextValue, lastPart);
  }

  // Partial property name - filter suggestions
  return getPropertySuggestions(contextValue, lastPart);
}

/**
 * Get suggestions for inside a filter expression [?(@.
 */
function getFilterSuggestions(data: unknown, arrayPath: string, prefix: string): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Parse the array path to get to the array
  const { parts } = parsePartialPath(arrayPath);
  const arrayValue = getValueAtPath(data, parts);

  // We need an array with at least one element to suggest properties
  if (!Array.isArray(arrayValue) || arrayValue.length === 0) {
    return suggestions;
  }

  // Get the first element to determine available properties
  const firstElement = arrayValue[0];

  if (firstElement === null || typeof firstElement !== "object" || Array.isArray(firstElement)) {
    return suggestions;
  }

  // Suggest properties from the first element
  const keys = Object.keys(firstElement);
  const lowerPrefix = prefix.toLowerCase();

  for (const key of keys) {
    if (key.toLowerCase().startsWith(lowerPrefix)) {
      const childValue = (firstElement as Record<string, unknown>)[key];
      const childType = getValueTypeDescription(childValue);

      // Create a helpful description with comparison hint
      let description = childType;
      if (typeof childValue === "number") {
        description += " (use >, <, ==)";
      } else if (typeof childValue === "string") {
        description += ` (use == "val")`;
      }

      suggestions.push({
        value: key,
        label: key,
        description,
        type: "property",
      });
    }
  }

  // Also suggest comparison operators if we have a complete property name
  if (prefix && keys.includes(prefix)) {
    const propValue = (firstElement as Record<string, unknown>)[prefix];

    if (typeof propValue === "number") {
      suggestions.unshift(
        { value: `${prefix}>`, label: `${prefix} >`, description: "Greater than", type: "operator" },
        { value: `${prefix}<`, label: `${prefix} <`, description: "Less than", type: "operator" },
        { value: `${prefix}>=`, label: `${prefix} >=`, description: "Greater or equal", type: "operator" },
        { value: `${prefix}<=`, label: `${prefix} <=`, description: "Less or equal", type: "operator" },
        { value: `${prefix}==`, label: `${prefix} ==`, description: "Equals", type: "operator" },
      );
    } else if (typeof propValue === "string") {
      suggestions.unshift(
        { value: `${prefix}=="`, label: `${prefix} == ""`, description: "Equals string", type: "operator" },
      );
    } else if (typeof propValue === "boolean") {
      suggestions.unshift(
        { value: `${prefix}==true`, label: `${prefix} == true`, description: "Is true", type: "operator" },
        { value: `${prefix}==false`, label: `${prefix} == false`, description: "Is false", type: "operator" },
      );
    }
  }

  return suggestions;
}

/**
 * Get property suggestions for an object
 */
function getPropertySuggestions(value: unknown, prefix: string): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Always suggest recursive descent
  if ("..".startsWith(prefix) || prefix === "") {
    suggestions.push({
      value: "..",
      label: "..",
      description: "Recursive descent",
      type: "operator",
    });
  }

  if (value === null || value === undefined) {
    return suggestions;
  }

  // If it's an array, suggest index access
  if (Array.isArray(value)) {
    if ("[".startsWith(prefix) || prefix === "") {
      suggestions.push({
        value: "[",
        label: "[...]",
        description: `Array with ${value.length} items`,
        type: "index",
      });
    }
    return suggestions;
  }

  // If it's an object, suggest properties
  if (typeof value === "object") {
    const keys = Object.keys(value as object);
    const lowerPrefix = prefix.toLowerCase();

    for (const key of keys) {
      if (key.toLowerCase().startsWith(lowerPrefix)) {
        const childValue = (value as Record<string, unknown>)[key];
        const childType = getValueTypeDescription(childValue);

        // Check if key needs bracket notation (has special chars)
        const needsBrackets = /[^a-zA-Z0-9_$]/.test(key);

        suggestions.push({
          value: needsBrackets ? `["${key}"]` : key,
          label: key,
          description: childType,
          type: "property",
        });
      }
    }
  }

  return suggestions;
}

/**
 * Get suggestions for bracket notation
 */
function getBracketSuggestions(value: unknown, partial: string): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Extract what's inside the bracket so far
  const innerPart = partial.replace(/^\[/, "").replace(/\]$/, "");

  // Always suggest wildcard
  if ("*".startsWith(innerPart) || innerPart === "") {
    suggestions.push({
      value: "[*]",
      label: "[*]",
      description: "All elements",
      type: "wildcard",
    });
  }

  // Suggest filter expression
  if ("?".startsWith(innerPart) || innerPart === "") {
    suggestions.push({
      value: "[?(@.",
      label: "[?(@...)]",
      description: "Filter expression",
      type: "filter",
    });
  }

  // If it's an array, suggest indices
  if (Array.isArray(value)) {
    const len = value.length;
    const maxSuggestions = Math.min(len, 10); // Limit suggestions

    for (let i = 0; i < maxSuggestions; i++) {
      const indexStr = String(i);
      if (indexStr.startsWith(innerPart) || innerPart === "") {
        const itemType = getValueTypeDescription(value[i]);
        suggestions.push({
          value: `[${i}]`,
          label: `[${i}]`,
          description: itemType,
          type: "index",
        });
      }
    }

    // If array has more items, indicate that
    if (len > maxSuggestions && innerPart === "") {
      suggestions.push({
        value: `[${maxSuggestions}]`,
        label: `[${maxSuggestions}...]`,
        description: `${len - maxSuggestions} more items`,
        type: "index",
      });
    }
  }

  return suggestions;
}

/**
 * Get a human-readable description of a value's type
 */
function getValueTypeDescription(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return `array[${value.length}]`;
  if (typeof value === "object") return `object{${Object.keys(value).length}}`;
  if (typeof value === "string") {
    const preview = value.length > 20 ? value.slice(0, 20) + "..." : value;
    return `"${preview}"`;
  }
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  return typeof value;
}

/**
 * Apply a suggestion to the current query
 */
export function applySuggestion(query: string, suggestion: Suggestion): string {
  // Check if we're inside a filter expression
  const filterContext = parseFilterContext(query);
  if (filterContext.inFilter) {
    // Inside filter: replace the partial property with the suggestion
    const baseQuery = query.slice(0, query.length - filterContext.filterPrefix.length);
    return baseQuery + suggestion.value;
  }

  const { parts, lastPart } = parsePartialPath(query);

  // Remove the incomplete last part
  let basePath = "";
  if (parts.length <= 1) {
    basePath = "$";
  } else {
    const completeParts = lastPart === "" || lastPart.startsWith("[")
      ? parts.slice(0, -1)
      : parts.slice(0, -1);

    basePath = completeParts[0]; // Start with $
    for (let i = 1; i < completeParts.length; i++) {
      const part = completeParts[i];
      if (part.startsWith("[")) {
        basePath += part;
      } else {
        basePath += "." + part;
      }
    }
  }

  // Add the suggestion
  const suggestionValue = suggestion.value;

  if (suggestionValue === "$") {
    return "$";
  }

  if (suggestionValue === "..") {
    return basePath + "..";
  }

  if (suggestionValue.startsWith("[")) {
    return basePath + suggestionValue;
  }

  // Property - add with dot
  if (basePath === "$") {
    return "$." + suggestionValue;
  }

  return basePath + "." + suggestionValue;
}
