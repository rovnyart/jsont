import { jsonrepair } from "jsonrepair";

export interface RepairResult {
  success: boolean;
  repaired: string;
  error?: string;
}

/**
 * Attempts to repair malformed JSON using the jsonrepair library.
 *
 * Handles common issues like:
 * - Missing quotes around keys/values
 * - Missing commas between elements
 * - Missing colons after keys
 * - Unclosed strings, arrays, objects
 * - Single quotes → double quotes
 * - Trailing commas
 * - Python constants (None, True, False)
 * - Unescaped control characters
 * - Truncated JSON
 */
export function repairJson(input: string): RepairResult {
  if (!input.trim()) {
    return {
      success: false,
      repaired: input,
      error: "Empty input",
    };
  }

  try {
    const repaired = jsonrepair(input);

    // Verify the result is valid JSON
    JSON.parse(repaired);

    return {
      success: true,
      repaired,
    };
  } catch (err) {
    return {
      success: false,
      repaired: input,
      error: err instanceof Error ? err.message : "Unknown repair error",
    };
  }
}

/**
 * Check if the input can potentially be repaired.
 * Returns true if the input is invalid JSON but might be fixable.
 */
export function canAttemptRepair(input: string): boolean {
  if (!input.trim()) return false;

  try {
    JSON.parse(input);
    // Already valid JSON, no repair needed
    return false;
  } catch {
    // Invalid JSON - repair might help
    return true;
  }
}
