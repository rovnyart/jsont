/**
 * Encoding/Decoding utilities for JSON
 */

export type EncodingOperation =
  | "base64-encode"
  | "base64-decode"
  | "url-encode"
  | "url-decode"
  | "escape"
  | "unescape";

export interface EncodingResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Base64 encode a string (handles Unicode)
 */
export function base64Encode(input: string): EncodingResult {
  try {
    const bytes = new TextEncoder().encode(input);
    const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join("");
    const encoded = btoa(binString);
    return { success: true, data: encoded };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to encode",
    };
  }
}

/**
 * Base64 decode a string (handles Unicode)
 */
export function base64Decode(input: string): EncodingResult {
  try {
    const binString = atob(input.trim());
    const bytes = Uint8Array.from(binString, (char) => char.codePointAt(0)!);
    const decoded = new TextDecoder().decode(bytes);
    return { success: true, data: decoded };
  } catch {
    return {
      success: false,
      error: "Invalid Base64 string",
    };
  }
}

/**
 * URL encode a string
 */
export function urlEncode(input: string): EncodingResult {
  try {
    const encoded = encodeURIComponent(input);
    return { success: true, data: encoded };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to encode",
    };
  }
}

/**
 * URL decode a string
 */
export function urlDecode(input: string): EncodingResult {
  try {
    const decoded = decodeURIComponent(input.trim());
    return { success: true, data: decoded };
  } catch {
    return {
      success: false,
      error: "Invalid URL-encoded string",
    };
  }
}

/**
 * Escape a string for use as JSON string value
 * This wraps the content in quotes and escapes special characters
 */
export function escapeJsonString(input: string): EncodingResult {
  try {
    // Use JSON.stringify to properly escape
    const escaped = JSON.stringify(input);
    return { success: true, data: escaped };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to escape",
    };
  }
}

/**
 * Unescape a JSON string value
 * This parses a quoted string and returns the unescaped content
 */
export function unescapeJsonString(input: string): EncodingResult {
  try {
    const trimmed = input.trim();

    // If it's a quoted string, parse it
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      // For single quotes, convert to double quotes for JSON.parse
      const normalized = trimmed.startsWith("'")
        ? `"${trimmed.slice(1, -1)}"`
        : trimmed;
      const unescaped = JSON.parse(normalized);
      return { success: true, data: unescaped };
    }

    // If not quoted, try to parse as-is (might be an escaped string without quotes)
    // First try adding quotes
    try {
      const unescaped = JSON.parse(`"${trimmed}"`);
      return { success: true, data: unescaped };
    } catch {
      // Return as-is if nothing works
      return { success: true, data: trimmed };
    }
  } catch {
    return {
      success: false,
      error: "Invalid escaped string",
    };
  }
}

/**
 * Apply an encoding operation
 */
export function applyEncoding(
  input: string,
  operation: EncodingOperation
): EncodingResult {
  switch (operation) {
    case "base64-encode":
      return base64Encode(input);
    case "base64-decode":
      return base64Decode(input);
    case "url-encode":
      return urlEncode(input);
    case "url-decode":
      return urlDecode(input);
    case "escape":
      return escapeJsonString(input);
    case "unescape":
      return unescapeJsonString(input);
    default:
      return { success: false, error: "Unknown operation" };
  }
}

/**
 * Get operation display name
 */
export function getOperationName(operation: EncodingOperation): string {
  switch (operation) {
    case "base64-encode":
      return "Base64 Encode";
    case "base64-decode":
      return "Base64 Decode";
    case "url-encode":
      return "URL Encode";
    case "url-decode":
      return "URL Decode";
    case "escape":
      return "Escape String";
    case "unescape":
      return "Unescape String";
  }
}
