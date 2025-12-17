import { Diagnostic } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";

export interface JsonError {
  message: string;
  line: number;
  column: number;
  position: number;
}

/**
 * Parse JSON and extract detailed error information
 */
export function parseJsonWithErrors(text: string): {
  valid: boolean;
  error: JsonError | null;
  data: unknown;
} {
  if (!text.trim()) {
    return { valid: true, error: null, data: null };
  }

  try {
    const data = JSON.parse(text);
    return { valid: true, error: null, data };
  } catch (e) {
    if (e instanceof SyntaxError) {
      const error = extractErrorPosition(e.message, text);
      return { valid: false, error, data: null };
    }
    return {
      valid: false,
      error: {
        message: String(e),
        line: 1,
        column: 1,
        position: 0,
      },
      data: null,
    };
  }
}

/**
 * Extract line and column from JSON parse error message
 */
function extractErrorPosition(message: string, text: string): JsonError {
  // Try to extract position from error message
  // Common formats:
  // - "... at position 123"
  // - "... at line 5 column 10"
  // - "Unexpected token ... at position 123"

  let position = 0;
  let line = 1;
  let column = 1;

  // Try "at position X" format
  const posMatch = message.match(/at position (\d+)/i);
  if (posMatch) {
    position = parseInt(posMatch[1], 10);
    const loc = positionToLineColumn(text, position);
    line = loc.line;
    column = loc.column;
  }

  // Try "line X column Y" format
  const lineColMatch = message.match(/line (\d+) column (\d+)/i);
  if (lineColMatch) {
    line = parseInt(lineColMatch[1], 10);
    column = parseInt(lineColMatch[2], 10);
    position = lineColumnToPosition(text, line, column);
  }

  // Clean up the error message
  const cleanMessage = cleanErrorMessage(message);

  return { message: cleanMessage, line, column, position };
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
    position += lines[i].length + 1; // +1 for newline
  }
  position += column - 1;
  return position;
}

/**
 * Clean up JSON error message for display
 */
function cleanErrorMessage(message: string): string {
  // Remove redundant prefixes
  let clean = message
    .replace(/^JSON\.parse:\s*/i, "")
    .replace(/^SyntaxError:\s*/i, "")
    .replace(/^Unexpected/i, "Unexpected");

  // Make common errors more readable
  const errorMappings: [RegExp, string][] = [
    [/Unexpected token (.+?) in JSON/i, "Unexpected character: $1"],
    [/Unexpected end of JSON input/i, "Unexpected end of input - missing closing bracket or quote?"],
    [/Expected .+ but found/i, clean], // Keep as is
    [/Unexpected non-whitespace character after JSON/i, "Extra content after JSON - remove trailing characters"],
  ];

  for (const [pattern, replacement] of errorMappings) {
    if (pattern.test(clean)) {
      clean = clean.replace(pattern, replacement);
      break;
    }
  }

  return clean;
}

/**
 * Create CodeMirror lint diagnostics from JSON
 */
export function jsonLinter(view: EditorView): Diagnostic[] {
  const text = view.state.doc.toString();
  const { valid, error } = parseJsonWithErrors(text);

  if (valid || !error) {
    return [];
  }

  // Calculate the position in the document
  const pos = Math.min(error.position, text.length);

  // Find a reasonable range to highlight
  // Try to highlight the problematic token or character
  let from = pos;
  let to = pos + 1;

  // Expand selection to include the problematic token
  if (pos < text.length) {
    // Find word boundaries
    const before = text.slice(Math.max(0, pos - 20), pos);
    const after = text.slice(pos, Math.min(text.length, pos + 20));

    // Find start of token
    const startMatch = before.match(/[\s,:\[\]{}]*([^\s,:\[\]{}]*)$/);
    if (startMatch) {
      from = pos - startMatch[1].length;
    }

    // Find end of token
    const endMatch = after.match(/^([^\s,:\[\]{}]*)/);
    if (endMatch) {
      to = pos + endMatch[1].length;
    }
  }

  // Ensure we highlight at least one character
  if (from === to) {
    to = Math.min(from + 1, text.length);
  }

  // Clamp to valid range
  from = Math.max(0, from);
  to = Math.min(text.length, to);

  return [
    {
      from,
      to,
      severity: "error",
      message: error.message,
      source: "json",
    },
  ];
}

/**
 * Get a human-friendly error summary for the status bar
 */
export function getErrorSummary(text: string): string | null {
  const { valid, error } = parseJsonWithErrors(text);

  if (valid || !error) {
    return null;
  }

  return `Line ${error.line}, Col ${error.column}: ${error.message}`;
}
