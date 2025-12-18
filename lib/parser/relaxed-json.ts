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

  // Preprocess: handle undefined, Python None/True/False
  let preprocessed = preprocessPythonAndUndefined(trimmed);

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
 * Replace `undefined` and Python's `None` with `null` for JSON5 parsing.
 * Also handles Python's `True` and `False` booleans.
 * Be careful not to replace these inside strings.
 */
function preprocessPythonAndUndefined(input: string): string {
  // Replace undefined, None, True, False that are not inside quotes
  // These are preceded by : or [ or , or start and followed by , or ] or } or end or whitespace
  return input
    .replace(/(?<=[:,\[\s]|^)\s*undefined\s*(?=[,\]\}\s]|$)/g, "null")
    .replace(/(?<=[:,\[\s]|^)\s*None\s*(?=[,\]\}\s]|$)/g, "null")
    .replace(/(?<=[:,\[\s]|^)\s*True\s*(?=[,\]\}\s]|$)/g, "true")
    .replace(/(?<=[:,\[\s]|^)\s*False\s*(?=[,\]\}\s]|$)/g, "false");
}

/**
 * Convert JavaScript expressions to JSON-compatible values.
 * Handles: variable references, template literals, arrow functions,
 * regular functions, regex literals, new expressions, BigInt, binary/octal numbers.
 *
 * Examples:
 *   foo.bar              → "[JS: foo.bar]"
 *   `hello ${name}`      → "[JS: `hello ${name}`]"
 *   () => {}             → "[JS: () => {}]"
 *   function() {}        → "[JS: function() {}]"
 *   /pattern/gi          → "[JS: /pattern/gi]"
 *   new Date()           → "[JS: new Date()]"
 *   123n                 → 123
 *   0b1010               → 10
 *   0o755                → 493
 *   .5                   → 0.5
 *   5.                   → 5.0
 */
function preprocessVariableReferences(input: string): string {
  const literals = new Set(['true', 'false', 'null', 'Infinity', 'NaN']);
  const result: string[] = [];
  let i = 0;
  // Stack to track whether we're in array '[' or object '{'
  const contextStack: ('{' | '[')[] = [];

  // Helper to check if we're in a value context
  const isValueContext = (): boolean => {
    let lookbackIdx = result.length - 1;
    while (lookbackIdx >= 0 && /\s/.test(result[lookbackIdx])) {
      lookbackIdx--;
    }
    const prevChar = lookbackIdx >= 0 ? result[lookbackIdx] : '';

    // After ':' is always a value context
    if (prevChar === ':') return true;

    // After '[' is always a value context (array element)
    if (prevChar === '[') return true;

    // After ',' depends on context: in arrays it's a value, in objects it's a key
    if (prevChar === ',') {
      const currentContext = contextStack.length > 0 ? contextStack[contextStack.length - 1] : null;
      return currentContext === '['; // Only value context in arrays
    }

    return false;
  };

  // Helper to escape string for JSON
  const escapeForJson = (str: string): string => {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  };

  // Helper to collect balanced braces/parens
  const collectBalanced = (openChar: string, closeChar: string): string => {
    let content = openChar;
    i++;
    let depth = 1;
    while (i < input.length && depth > 0) {
      const c = input[i];
      if (c === openChar) depth++;
      if (c === closeChar) depth--;
      content += c;
      i++;
    }
    return content;
  };

  while (i < input.length) {
    const char = input[i];

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

    // Handle template literals (backticks)
    if (char === '`' && isValueContext()) {
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
      result.push(`"[JS: ${escapeForJson(template)}]"`);
      continue;
    }

    // Handle regex literals
    if (char === '/' && isValueContext()) {
      // Make sure it's not a comment
      if (i + 1 < input.length && input[i + 1] !== '/' && input[i + 1] !== '*') {
        let regex = '/';
        i++;
        let inCharClass = false;
        // Collect pattern
        while (i < input.length) {
          const c = input[i];
          regex += c;
          if (c === '\\' && i + 1 < input.length) {
            regex += input[i + 1];
            i += 2;
            continue;
          }
          if (c === '[') inCharClass = true;
          if (c === ']') inCharClass = false;
          if (c === '/' && !inCharClass) {
            i++;
            break;
          }
          i++;
        }
        // Collect flags
        while (i < input.length && /[gimsuy]/.test(input[i])) {
          regex += input[i];
          i++;
        }
        result.push(`"[JS: ${escapeForJson(regex)}]"`);
        continue;
      }
    }

    // Handle comments
    if (char === '/' && i + 1 < input.length) {
      if (input[i + 1] === '/') {
        while (i < input.length && input[i] !== '\n') {
          result.push(input[i]);
          i++;
        }
        continue;
      }
      if (input[i + 1] === '*') {
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

    // Handle arrow functions: () => ... or (args) => ... or arg => ...
    if (char === '(' && isValueContext()) {
      // Look ahead to see if this is an arrow function
      const parenContent = collectBalanced('(', ')');

      // Skip whitespace
      let tempI = i;
      while (tempI < input.length && /\s/.test(input[tempI])) tempI++;

      // Check for arrow
      if (tempI + 1 < input.length && input[tempI] === '=' && input[tempI + 1] === '>') {
        let arrow = parenContent;
        i = tempI;
        arrow += ' =>';
        i += 2;

        // Skip whitespace
        while (i < input.length && /\s/.test(input[i])) {
          arrow += input[i];
          i++;
        }

        // Collect arrow body
        if (i < input.length) {
          if (input[i] === '{') {
            arrow += collectBalanced('{', '}');
          } else {
            // Expression body - collect until comma, }, or ]
            while (i < input.length && !/[,}\]]/.test(input[i])) {
              arrow += input[i];
              i++;
            }
            arrow = arrow.trimEnd();
          }
        }
        result.push(`"[JS: ${escapeForJson(arrow)}]"`);
        continue;
      } else {
        // Not an arrow function, just output the parens
        result.push(parenContent);
        continue;
      }
    }

    // Handle leading decimal (.5 -> 0.5)
    if (char === '.' && isValueContext()) {
      if (i + 1 < input.length && /\d/.test(input[i + 1])) {
        result.push('0');
      }
      result.push(char);
      i++;
      continue;
    }

    // Handle identifiers and special constructs
    if (/[a-zA-Z_$]/.test(char) && isValueContext()) {
      // Collect the full identifier first
      let expr = '';
      while (i < input.length && /[a-zA-Z0-9_$]/.test(input[i])) {
        expr += input[i];
        i++;
      }

      // Check for 'function' keyword
      if (expr === 'function') {
        // Skip whitespace
        while (i < input.length && /\s/.test(input[i])) {
          expr += input[i];
          i++;
        }
        // Optional function name
        if (i < input.length && /[a-zA-Z_$]/.test(input[i])) {
          while (i < input.length && /[a-zA-Z0-9_$]/.test(input[i])) {
            expr += input[i];
            i++;
          }
          while (i < input.length && /\s/.test(input[i])) {
            expr += input[i];
            i++;
          }
        }
        // Parameters
        if (i < input.length && input[i] === '(') {
          expr += collectBalanced('(', ')');
        }
        // Skip whitespace
        while (i < input.length && /\s/.test(input[i])) {
          expr += input[i];
          i++;
        }
        // Function body
        if (i < input.length && input[i] === '{') {
          expr += collectBalanced('{', '}');
        }
        result.push(`"[JS: ${escapeForJson(expr)}]"`);
        continue;
      }

      // Check for 'new' keyword
      if (expr === 'new') {
        // Skip whitespace
        while (i < input.length && /\s/.test(input[i])) {
          expr += input[i];
          i++;
        }
        // Constructor name
        while (i < input.length && /[a-zA-Z0-9_$.]/.test(input[i])) {
          expr += input[i];
          i++;
        }
        // Optional arguments
        if (i < input.length && input[i] === '(') {
          expr += collectBalanced('(', ')');
        }
        result.push(`"[JS: ${escapeForJson(expr)}]"`);
        continue;
      }

      // Check if it's a literal
      if (literals.has(expr)) {
        result.push(expr);
        continue;
      }

      // Continue collecting expression (dots, brackets, parens)
      while (i < input.length) {
        const c = input[i];
        if (c === '.') {
          expr += c;
          i++;
          // Collect identifier after dot
          while (i < input.length && /[a-zA-Z0-9_$]/.test(input[i])) {
            expr += input[i];
            i++;
          }
        } else if (c === '[') {
          expr += collectBalanced('[', ']');
        } else if (c === '(') {
          expr += collectBalanced('(', ')');
        } else {
          break;
        }
      }

      // Check for single identifier followed by arrow (x => ...)
      const afterExpr = input.slice(i);
      const arrowMatch = afterExpr.match(/^\s*=>\s*/);
      if (arrowMatch && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(expr)) {
        expr += arrowMatch[0];
        i += arrowMatch[0].length;

        // Collect arrow body
        if (i < input.length) {
          if (input[i] === '{') {
            expr += collectBalanced('{', '}');
          } else {
            while (i < input.length && !/[,}\]]/.test(input[i])) {
              expr += input[i];
              i++;
            }
            expr = expr.trimEnd();
          }
        }
        result.push(`"[JS: ${escapeForJson(expr)}]"`);
        continue;
      }

      // It's a variable expression - convert to string
      result.push(`"[JS: ${escapeForJson(expr)}]"`);
      continue;
    }

    // Handle numbers: binary (0b), octal (0o), BigInt (n suffix), trailing decimal
    if (/[0-9]/.test(char) && isValueContext()) {
      let num = '';

      // Check for 0b (binary) or 0o (octal) or 0x (hex)
      if (char === '0' && i + 1 < input.length) {
        const nextChar = input[i + 1].toLowerCase();
        if (nextChar === 'b') {
          // Binary
          i += 2;
          let binary = '';
          while (i < input.length && /[01]/.test(input[i])) {
            binary += input[i];
            i++;
          }
          // Check for BigInt suffix
          if (i < input.length && input[i] === 'n') {
            i++;
          }
          result.push(String(parseInt(binary, 2)));
          continue;
        } else if (nextChar === 'o') {
          // Octal
          i += 2;
          let octal = '';
          while (i < input.length && /[0-7]/.test(input[i])) {
            octal += input[i];
            i++;
          }
          // Check for BigInt suffix
          if (i < input.length && input[i] === 'n') {
            i++;
          }
          result.push(String(parseInt(octal, 8)));
          continue;
        } else if (nextChar === 'x') {
          // Hex - let it pass through (JSON5 handles it)
          while (i < input.length && /[0-9a-fA-Fx]/.test(input[i])) {
            num += input[i];
            i++;
          }
          // Check for BigInt suffix
          if (i < input.length && input[i] === 'n') {
            i++;
            result.push(String(parseInt(num, 16)));
          } else {
            result.push(num);
          }
          continue;
        }
      }

      // Regular number (possibly with BigInt suffix or trailing decimal)
      while (i < input.length && /[0-9]/.test(input[i])) {
        num += input[i];
        i++;
      }

      // Handle decimal part
      if (i < input.length && input[i] === '.') {
        num += input[i];
        i++;
        // Check for trailing decimal (5. -> 5.0)
        if (i >= input.length || !/[0-9]/.test(input[i])) {
          num += '0';
        } else {
          while (i < input.length && /[0-9]/.test(input[i])) {
            num += input[i];
            i++;
          }
        }
      }

      // Handle exponent
      if (i < input.length && /[eE]/.test(input[i])) {
        num += input[i];
        i++;
        if (i < input.length && /[+-]/.test(input[i])) {
          num += input[i];
          i++;
        }
        while (i < input.length && /[0-9]/.test(input[i])) {
          num += input[i];
          i++;
        }
      }

      // Check for BigInt suffix
      if (i < input.length && input[i] === 'n') {
        i++; // Skip the 'n', output the number without it
      }

      result.push(num);
      continue;
    }

    // Track context for arrays and objects
    if (char === '{' || char === '[') {
      contextStack.push(char);
    } else if (char === '}' || char === ']') {
      contextStack.pop();
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

  // Check for Python None
  if (/[:,\[]\s*None\s*[,\]\}]/.test(input)) {
    features.push("Python None");
  }

  // Check for Python True/False (capitalized)
  if (/[:,\[]\s*(True|False)\s*[,\]\}]/.test(input)) {
    features.push("Python booleans");
  }

  // Check for arrow functions
  if (/[:,\[]\s*(\([^)]*\)|[a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>/.test(input)) {
    features.push("arrow functions");
  }

  // Check for function expressions
  if (/[:,\[]\s*function\s*[a-zA-Z_$]*\s*\(/.test(input)) {
    features.push("functions");
  }

  // Check for regex literals
  if (/[:,\[]\s*\/[^/\n]+\/[gimsuy]*\s*[,\]\}]/.test(input)) {
    features.push("regex literals");
  }

  // Check for new expressions
  if (/[:,\[]\s*new\s+[a-zA-Z_$]/.test(input)) {
    features.push("new expressions");
  }

  // Check for BigInt literals
  if (/[:,\[]\s*\d+n\s*[,\]\}]/.test(input)) {
    features.push("BigInt");
  }

  // Check for binary literals
  if (/[:,\[]\s*0b[01]+/.test(input)) {
    features.push("binary numbers");
  }

  // Check for octal literals
  if (/[:,\[]\s*0o[0-7]+/.test(input)) {
    features.push("octal numbers");
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
