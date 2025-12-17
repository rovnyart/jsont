import { Diagnostic } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import {
  parseRelaxedJson,
  isStrictJson,
  detectRelaxedFeatures,
} from "@/lib/parser/relaxed-json";

export interface JsonError {
  message: string;
  line: number;
  column: number;
  position: number;
}

export interface ValidationResult {
  valid: boolean;
  strict: boolean; // true if valid strict JSON
  relaxed: boolean; // true if valid relaxed JSON (but not strict)
  error: JsonError | null;
  relaxedFeatures: string[];
}

/**
 * Validate JSON content (supports both strict and relaxed syntax)
 */
export function validateJson(text: string): ValidationResult {
  if (!text.trim()) {
    return {
      valid: true,
      strict: true,
      relaxed: false,
      error: null,
      relaxedFeatures: [],
    };
  }

  // Check if it's valid strict JSON
  if (isStrictJson(text)) {
    return {
      valid: true,
      strict: true,
      relaxed: false,
      error: null,
      relaxedFeatures: [],
    };
  }

  // Try relaxed parsing
  const result = parseRelaxedJson(text);

  if (result.success) {
    return {
      valid: true,
      strict: false,
      relaxed: true,
      error: null,
      relaxedFeatures: detectRelaxedFeatures(text),
    };
  }

  return {
    valid: false,
    strict: false,
    relaxed: false,
    error: result.error,
    relaxedFeatures: [],
  };
}

/**
 * Create CodeMirror lint diagnostics from JSON
 */
export function jsonLinter(view: EditorView): Diagnostic[] {
  const text = view.state.doc.toString();
  const validation = validateJson(text);

  // No errors if valid (strict or relaxed)
  if (validation.valid) {
    return [];
  }

  if (!validation.error) {
    return [];
  }

  const { error } = validation;

  // Calculate the position in the document
  const pos = Math.min(error.position, text.length);

  // Find a reasonable range to highlight
  let from = pos;
  let to = pos + 1;

  // Expand selection to include the problematic token
  if (pos < text.length) {
    const before = text.slice(Math.max(0, pos - 20), pos);
    const after = text.slice(pos, Math.min(text.length, pos + 20));

    const startMatch = before.match(/[\s,:\[\]{}]*([^\s,:\[\]{}]*)$/);
    if (startMatch) {
      from = pos - startMatch[1].length;
    }

    const endMatch = after.match(/^([^\s,:\[\]{}]*)/);
    if (endMatch) {
      to = pos + endMatch[1].length;
    }
  }

  if (from === to) {
    to = Math.min(from + 1, text.length);
  }

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
  const validation = validateJson(text);

  if (validation.valid) {
    return null;
  }

  if (!validation.error) {
    return "Invalid JSON";
  }

  const { error } = validation;
  return `Line ${error.line}, Col ${error.column}: ${error.message}`;
}

/**
 * Get validation status for the status bar
 */
export function getValidationStatus(text: string): {
  status: "idle" | "valid" | "relaxed" | "invalid";
  message: string | null;
  features: string[];
} {
  if (!text.trim()) {
    return { status: "idle", message: null, features: [] };
  }

  const validation = validateJson(text);

  if (validation.strict) {
    return { status: "valid", message: null, features: [] };
  }

  if (validation.relaxed) {
    return {
      status: "relaxed",
      message: null,
      features: validation.relaxedFeatures,
    };
  }

  const errorMsg = validation.error
    ? `Line ${validation.error.line}, Col ${validation.error.column}: ${validation.error.message}`
    : "Invalid JSON";

  return { status: "invalid", message: errorMsg, features: [] };
}
