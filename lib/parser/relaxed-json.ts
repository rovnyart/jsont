import JSON5 from "json5";

export interface ParseResult {
  success: boolean;
  data: unknown;
  normalized: string | null;
  error: ParseError | null;
  wasRelaxed: boolean; // true if input wasn't strict JSON but was parseable
}

export interface ParseError {
  message: string;
  line: number;
  column: number;
  position: number;
}

/**
 * Parse JSON with relaxed syntax support.
 *
 * Accepts: valid JSON, single quotes, trailing commas, comments,
 * unquoted keys, undefined/NaN/Infinity, and hex numbers.
 */
export function parseRelaxedJson(input: string): ParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      success: true,
      data: null,
      normalized: null,
      error: null,
      wasRelaxed: false,
    };
  }

  // First, try strict JSON parse
  try {
    const data = JSON.parse(trimmed);
    return {
      success: true,
      data,
      normalized: JSON.stringify(data, null, 2),
      error: null,
      wasRelaxed: false,
    };
  } catch {
    // Not valid strict JSON, try relaxed parsing
  }

  // Preprocess: handle undefined and variable references
  let preprocessed = preprocessUndefined(trimmed);

  // First attempt with basic preprocessing
  try {
    const data = JSON5.parse(preprocessed);
    const normalizedData = normalizeValue(data);
    return {
      success: true,
      data: normalizedData,
      normalized: JSON.stringify(normalizedData, null, 2),
      error: null,
      wasRelaxed: true,
    };
  } catch {
    // If that fails, try converting JS variable references to strings
  }

  // Preprocess: convert JS variable references to strings
  preprocessed = preprocessVariableReferences(preprocessed);

  // Try JSON5 (relaxed) parsing with variable conversion
  try {
    const data = JSON5.parse(preprocessed);
    // Normalize special values
    const normalizedData = normalizeValue(data);
    return {
      success: true,
      data: normalizedData,
      normalized: JSON.stringify(normalizedData, null, 2),
      error: null,
      wasRelaxed: true,
    };
  } catch (e) {
    const error = extractParseError(e, trimmed);
    return {
      success: false,
      data: null,
      normalized: null,
      error,
      wasRelaxed: false,
    };
  }
}

/**
 * Replace `undefined` keyword with `null` for JSON5 parsing.
 * Be careful not to replace 'undefined' inside strings.
 */
function preprocessUndefined(input: string): string {
  // Simple approach: replace undefined that's not inside quotes
  // This regex matches `undefined` that's preceded by : or [ or , or start
  // and followed by , or ] or } or end or whitespace
  return input.replace(
    /(?<=[:,\[\s]|^)\s*undefined\s*(?=[,\]\}\s]|$)/g,
    "null"
  );
}

/**
 * Convert JavaScript variable references to strings.
 * Examples:
 *   foo.bar        → "[JS: foo.bar]"
 *   arr[0].name    → "[JS: arr[0].name]"
 *   someVar        → "[JS: someVar]"
 *   func()         → "[JS: func()]"
 */
function preprocessVariableReferences(input: string): string {
  // Known JSON5 literals that should NOT be converted
  const literals = ['true', 'false', 'null', 'Infinity', '-Infinity', 'NaN'];

  // Pattern for JS variable/expression: identifier followed by optional property access or calls
  // This matches things like: foo, foo.bar, foo[0], foo.bar[0].baz, func(), etc.
  const jsExpressionPattern = /(?<=[:,\[\s]|^)\s*([a-zA-Z_$][a-zA-Z0-9_$]*(?:\s*\.\s*[a-zA-Z_$][a-zA-Z0-9_$]*|\s*\[[^\]]+\]|\s*\([^)]*\))*)\s*(?=[,\]\}\s]|$)/g;

  return input.replace(jsExpressionPattern, (match, expr) => {
    const trimmedExpr = expr.trim();

    // Don't convert known literals
    if (literals.includes(trimmedExpr)) {
      return match;
    }

    // Don't convert if it looks like a number (hex, etc. are handled by JSON5)
    if (/^-?\d/.test(trimmedExpr) || /^0x/i.test(trimmedExpr)) {
      return match;
    }

    // Don't convert if it's already quoted somehow
    if (/^['"]/.test(trimmedExpr)) {
      return match;
    }

    // Convert to a string representation
    return `"[JS: ${trimmedExpr}]"`;
  });
}

/**
 * Check if input is valid strict JSON
 */
export function isStrictJson(input: string): boolean {
  try {
    JSON.parse(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if input is parseable (strict or relaxed)
 */
export function isParseable(input: string): boolean {
  const result = parseRelaxedJson(input);
  return result.success;
}

/**
 * Normalize a value, converting undefined to null recursively
 */
function normalizeValue(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value !== null && typeof value === "object") {
    const normalized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      normalized[key] = normalizeValue(val);
    }
    return normalized;
  }

  // Handle special number values that JSON doesn't support
  if (typeof value === "number") {
    if (Number.isNaN(value)) {
      return null; // or could use "NaN" string
    }
    if (!Number.isFinite(value)) {
      return null; // or could use "Infinity"/"-Infinity" string
    }
  }

  return value;
}

/**
 * Extract error position from parse error
 */
function extractParseError(e: unknown, input: string): ParseError {
  const message = e instanceof Error ? e.message : String(e);

  // JSON5 error format: "JSON5: invalid character 'x' at 1:5"
  const json5Match = message.match(/at (\d+):(\d+)/);
  if (json5Match) {
    const line = parseInt(json5Match[1], 10);
    const column = parseInt(json5Match[2], 10);
    return {
      message: cleanErrorMessage(message),
      line,
      column,
      position: lineColumnToPosition(input, line, column),
    };
  }

  // Standard JSON error format: "at position X"
  const posMatch = message.match(/at position (\d+)/i);
  if (posMatch) {
    const position = parseInt(posMatch[1], 10);
    const { line, column } = positionToLineColumn(input, position);
    return {
      message: cleanErrorMessage(message),
      line,
      column,
      position,
    };
  }

  return {
    message: cleanErrorMessage(message),
    line: 1,
    column: 1,
    position: 0,
  };
}

/**
 * Clean up error message for display
 */
function cleanErrorMessage(message: string): string {
  return message
    .replace(/^JSON5:\s*/i, "")
    .replace(/^SyntaxError:\s*/i, "")
    .replace(/\s+at \d+:\d+$/, "")
    .replace(/\s+at position \d+$/i, "");
}

/**
 * Convert character position to line and column
 */
function positionToLineColumn(
  text: string,
  position: number
): { line: number; column: number } {
  const lines = text.slice(0, position).split("\n");
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

/**
 * Convert line and column to character position
 */
function lineColumnToPosition(
  text: string,
  line: number,
  column: number
): number {
  const lines = text.split("\n");
  let position = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    position += lines[i].length + 1;
  }
  position += column - 1;
  return Math.min(position, text.length);
}

/**
 * Get a description of what relaxed features were used
 */
export function detectRelaxedFeatures(input: string): string[] {
  const features: string[] = [];

  // Check for single quotes
  if (/'[^']*'/.test(input)) {
    features.push("single quotes");
  }

  // Check for trailing commas
  if (/,\s*[\]\}]/.test(input)) {
    features.push("trailing commas");
  }

  // Check for comments
  if (/\/\/.*$|\/\*[\s\S]*?\*\//m.test(input)) {
    features.push("comments");
  }

  // Check for unquoted keys
  if (/{\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*:/.test(input)) {
    features.push("unquoted keys");
  }

  // Check for undefined
  if (/\bundefined\b/.test(input)) {
    features.push("undefined values");
  }

  // Check for NaN/Infinity
  if (/\b(NaN|Infinity|-Infinity)\b/.test(input)) {
    features.push("special numbers");
  }

  // Check for hex numbers
  if (/0x[0-9a-fA-F]+/.test(input)) {
    features.push("hex numbers");
  }

  // Check for variable references (identifiers with dots that aren't in strings)
  // This is a simple heuristic - look for patterns like `foo.bar` as values
  if (/[:,\[]\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*\./.test(input)) {
    features.push("variable references");
  }

  return features;
}
