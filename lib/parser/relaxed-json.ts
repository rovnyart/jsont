import JSON5 from "json5";
import YAML from "yaml";

export interface ParseResult {
  success: boolean;
  data: unknown;
  normalized: string | null;
  error: ParseError | null;
  wasRelaxed: boolean; // true if input wasn't strict JSON but was parseable
  wasYaml?: boolean; // true if input was parsed as YAML
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

  // Store native JSON error for better position reporting
  let nativeJsonError: ParseError | null = null;

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
  } catch (e) {
    // Capture native JSON error - it often has better position info
    nativeJsonError = extractParseError(e, trimmed);
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
    // Store JSON5 error for later
    const json5Error = extractParseError(e, trimmed);

    // Try YAML parsing as last resort
    // YAML is a superset of JSON, so valid YAML that isn't JSON5 might still work
    try {
      const data = YAML.parse(trimmed);
      // Only accept if we got a non-null result (empty YAML parses to null)
      if (data !== null && data !== undefined) {
        const normalizedData = normalizeValue(data);
        return {
          success: true,
          data: normalizedData,
          normalized: JSON.stringify(normalizedData, null, 2),
          error: null,
          wasRelaxed: true,
          wasYaml: true,
        };
      }
    } catch {
      // YAML parsing also failed, continue to error handling
    }

    // Use the error with the furthest position - it's likely more accurate
    // Native JSON.parse usually gives better positions for syntax errors
    let error = json5Error;
    if (nativeJsonError) {
      // Prefer native error if it points to a later position (deeper in file)
      if (nativeJsonError.position > json5Error.position) {
        error = nativeJsonError;
      }
    }

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
 * Convert JavaScript variable references and template literals to strings.
 * This carefully avoids matching inside quoted strings.
 * Examples:
 *   foo.bar              → "[JS: foo.bar]"
 *   arr[0].name          → "[JS: arr[0].name]"
 *   someVar              → "[JS: someVar]"
 *   `hello ${name}`      → "[JS: `hello ${name}`]"
 */
function preprocessVariableReferences(input: string): string {
  const literals = new Set(['true', 'false', 'null', 'Infinity', 'NaN']);
  const result: string[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    // Handle template literals (backticks) - convert to string representation
    if (char === '`') {
      // Look back to see if we're in a value context
      let lookbackIdx = result.length - 1;
      while (lookbackIdx >= 0 && /\s/.test(result[lookbackIdx])) {
        lookbackIdx--;
      }
      const prevChar = lookbackIdx >= 0 ? result[lookbackIdx] : '';
      const inValueContext = prevChar === ':' || prevChar === ',' || prevChar === '[';

      if (inValueContext) {
        // Collect the entire template literal
        let template = '`';
        i++;
        let braceDepth = 0;
        while (i < input.length) {
          const c = input[i];
          if (c === '\\' && i + 1 < input.length) {
            template += c + input[i + 1];
            i += 2;
            continue;
          }
          if (c === '$' && i + 1 < input.length && input[i + 1] === '{') {
            template += '${';
            i += 2;
            braceDepth++;
            continue;
          }
          if (braceDepth > 0) {
            if (c === '{') braceDepth++;
            if (c === '}') braceDepth--;
          }
          template += c;
          if (c === '`' && braceDepth === 0) {
            i++;
            break;
          }
          i++;
        }
        // Convert to a JSON string with escaped content
        const escaped = template.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        result.push(`"[JS: ${escaped}]"`);
        continue;
      }
    }

    // Handle strings - copy them verbatim
    if (char === '"' || char === "'") {
      const quote = char;
      result.push(char);
      i++;
      while (i < input.length) {
        const c = input[i];
        result.push(c);
        if (c === '\\' && i + 1 < input.length) {
          result.push(input[i + 1]);
          i += 2;
          continue;
        }
        if (c === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    // Handle comments
    if (char === '/' && i + 1 < input.length) {
      if (input[i + 1] === '/') {
        // Line comment
        while (i < input.length && input[i] !== '\n') {
          result.push(input[i]);
          i++;
        }
        continue;
      }
      if (input[i + 1] === '*') {
        // Block comment
        result.push(input[i], input[i + 1]);
        i += 2;
        while (i < input.length - 1) {
          if (input[i] === '*' && input[i + 1] === '/') {
            result.push('*', '/');
            i += 2;
            break;
          }
          result.push(input[i]);
          i++;
        }
        continue;
      }
    }

    // Check for unquoted identifier (potential variable reference)
    // Must be preceded by : , [ or whitespace (value context)
    if (/[a-zA-Z_$]/.test(char)) {
      // Look back to see if we're in a value context
      let lookbackIdx = result.length - 1;
      while (lookbackIdx >= 0 && /\s/.test(result[lookbackIdx])) {
        lookbackIdx--;
      }
      const prevChar = lookbackIdx >= 0 ? result[lookbackIdx] : '';
      const inValueContext = prevChar === ':' || prevChar === ',' || prevChar === '[';

      if (inValueContext) {
        // Collect the full identifier/expression
        let expr = '';
        while (i < input.length) {
          const c = input[i];
          // Allow: identifiers, dots, brackets, parens for expressions like foo.bar[0]()
          if (/[a-zA-Z0-9_$.]/.test(c)) {
            expr += c;
            i++;
          } else if (c === '[') {
            // Collect bracket content
            expr += c;
            i++;
            let bracketDepth = 1;
            while (i < input.length && bracketDepth > 0) {
              if (input[i] === '[') bracketDepth++;
              if (input[i] === ']') bracketDepth--;
              expr += input[i];
              i++;
            }
          } else if (c === '(') {
            // Collect paren content
            expr += c;
            i++;
            let parenDepth = 1;
            while (i < input.length && parenDepth > 0) {
              if (input[i] === '(') parenDepth++;
              if (input[i] === ')') parenDepth--;
              expr += input[i];
              i++;
            }
          } else {
            break;
          }
        }

        // Check if it's a literal or number
        if (literals.has(expr) || /^-?\d/.test(expr) || /^0x/i.test(expr)) {
          result.push(expr);
        } else {
          // It's a variable expression - convert to string
          result.push(`"[JS: ${expr}]"`);
        }
        continue;
      }
    }

    result.push(char);
    i++;
  }

  return result.join('');
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

  // Check for YAML format (try to detect YAML-specific patterns)
  if (isLikelyYaml(input)) {
    features.push("YAML format");
    return features; // If it's YAML, don't check for JSON5 features
  }

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

  // Check for template literals (backtick strings)
  if (/[:,\[]\s*`/.test(input)) {
    features.push("template literals");
  }

  return features;
}

/**
 * Check if input looks like YAML (not JSON)
 */
export function isLikelyYaml(input: string): boolean {
  const trimmed = input.trim();

  // If it starts with { or [, it's more likely JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return false;
  }

  // YAML document markers
  if (trimmed.startsWith("---") || trimmed.startsWith("...")) {
    return true;
  }

  // Check for YAML-style key: value on its own line (not inside braces)
  // Must have at least 2 such patterns to be confident
  const yamlKeyValuePattern = /^[a-zA-Z_][a-zA-Z0-9_]*:\s*\S/m;
  const matches = trimmed.match(new RegExp(yamlKeyValuePattern.source, "gm"));
  if (matches && matches.length >= 1) {
    // Also check there's no opening brace before the first key
    const firstKey = trimmed.search(yamlKeyValuePattern);
    const firstBrace = trimmed.indexOf("{");
    if (firstBrace === -1 || firstKey < firstBrace) {
      return true;
    }
  }

  // Check for YAML list items (- item)
  if (/^-\s+\S/m.test(trimmed)) {
    return true;
  }

  // Check for YAML multi-line strings (| or >)
  if (/:\s*[|>][-+]?\s*$/m.test(trimmed)) {
    return true;
  }

  return false;
}
