export type DiffType = "added" | "removed" | "modified" | "unchanged";

export interface DiffResult {
  path: string;
  type: DiffType;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface DiffSummary {
  differences: DiffResult[];
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
}

function getType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPrimitive(value: unknown): boolean {
  return value === null || (typeof value !== "object" && typeof value !== "function");
}

function sortArrayForComparison(arr: unknown[]): unknown[] {
  return [...arr].sort((a, b) => {
    const strA = JSON.stringify(a);
    const strB = JSON.stringify(b);
    return strA.localeCompare(strB);
  });
}

function arraysEqual(a: unknown[], b: unknown[], ignoreOrder: boolean): boolean {
  if (a.length !== b.length) return false;

  const arrA = ignoreOrder ? sortArrayForComparison(a) : a;
  const arrB = ignoreOrder ? sortArrayForComparison(b) : b;

  for (let i = 0; i < arrA.length; i++) {
    if (!deepEqual(arrA[i], arrB[i], ignoreOrder)) return false;
  }
  return true;
}

// Check if two values can be matched together (same type, similar structure for objects)
function canMatch(a: unknown, b: unknown): boolean {
  if (typeof a !== typeof b) return false;
  if (isPrimitive(a) || isPrimitive(b)) return typeof a === typeof b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  // For objects, check if they share at least some keys (heuristic for "same kind of object")
  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    // If both have keys, check for overlap
    if (keysA.length > 0 && keysB.length > 0) {
      const sharedKeys = keysA.filter(k => keysB.includes(k));
      // At least 50% key overlap to be considered matchable
      return sharedKeys.length >= Math.min(keysA.length, keysB.length) * 0.5;
    }
    return true; // Both empty objects
  }

  return true; // Arrays match with arrays
}

function deepEqual(a: unknown, b: unknown, ignoreOrder: boolean = false): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (isPrimitive(a) || isPrimitive(b)) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    return arraysEqual(a, b, ignoreOrder);
  }

  if (isObject(a) && isObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key], ignoreOrder)) return false;
    }
    return true;
  }

  return false;
}

function compareValues(
  oldVal: unknown,
  newVal: unknown,
  path: string,
  differences: DiffResult[],
  ignoreOrder: boolean
): void {
  const oldType = getType(oldVal);
  const newType = getType(newVal);

  // Different types
  if (oldType !== newType) {
    differences.push({
      path,
      type: "modified",
      oldValue: oldVal,
      newValue: newVal,
    });
    return;
  }

  // Both are primitives or null
  if (isPrimitive(oldVal) || isPrimitive(newVal)) {
    if (oldVal !== newVal) {
      differences.push({
        path,
        type: "modified",
        oldValue: oldVal,
        newValue: newVal,
      });
    }
    return;
  }

  // Both are arrays
  if (Array.isArray(oldVal) && Array.isArray(newVal)) {
    if (ignoreOrder) {
      // When ignoring order, try to match elements by finding best pairs
      const oldMatched = new Set<number>();
      const newMatched = new Set<number>();
      const pairs: Array<{ oldIdx: number; newIdx: number }> = [];

      // First pass: find exact matches
      for (let i = 0; i < oldVal.length; i++) {
        for (let j = 0; j < newVal.length; j++) {
          if (!newMatched.has(j) && deepEqual(oldVal[i], newVal[j], true)) {
            oldMatched.add(i);
            newMatched.add(j);
            pairs.push({ oldIdx: i, newIdx: j });
            break;
          }
        }
      }

      // Second pass: match remaining elements by structure similarity (same type, same keys for objects)
      for (let i = 0; i < oldVal.length; i++) {
        if (oldMatched.has(i)) continue;
        for (let j = 0; j < newVal.length; j++) {
          if (newMatched.has(j)) continue;
          if (canMatch(oldVal[i], newVal[j])) {
            oldMatched.add(i);
            newMatched.add(j);
            pairs.push({ oldIdx: i, newIdx: j });
            break;
          }
        }
      }

      // Report unmatched old elements as removed
      for (let i = 0; i < oldVal.length; i++) {
        if (!oldMatched.has(i)) {
          differences.push({
            path: `${path}[${i}]`,
            type: "removed",
            oldValue: oldVal[i],
          });
        }
      }

      // Report unmatched new elements as added
      for (let j = 0; j < newVal.length; j++) {
        if (!newMatched.has(j)) {
          differences.push({
            path: `${path}[${j}]`,
            type: "added",
            newValue: newVal[j],
          });
        }
      }

      // Compare matched pairs (use old index for path consistency)
      for (const { oldIdx, newIdx } of pairs) {
        if (!deepEqual(oldVal[oldIdx], newVal[newIdx], true)) {
          compareValues(oldVal[oldIdx], newVal[newIdx], `${path}[${oldIdx}]`, differences, ignoreOrder);
        }
      }
    } else {
      // Compare by index
      const maxLen = Math.max(oldVal.length, newVal.length);
      for (let i = 0; i < maxLen; i++) {
        const itemPath = `${path}[${i}]`;
        if (i >= oldVal.length) {
          differences.push({
            path: itemPath,
            type: "added",
            newValue: newVal[i],
          });
        } else if (i >= newVal.length) {
          differences.push({
            path: itemPath,
            type: "removed",
            oldValue: oldVal[i],
          });
        } else {
          compareValues(oldVal[i], newVal[i], itemPath, differences, ignoreOrder);
        }
      }
    }
    return;
  }

  // Both are objects
  if (isObject(oldVal) && isObject(newVal)) {
    const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);

    for (const key of allKeys) {
      const keyPath = path ? `${path}.${key}` : `$.${key}`;
      const hasOld = key in oldVal;
      const hasNew = key in newVal;

      if (hasOld && !hasNew) {
        differences.push({
          path: keyPath,
          type: "removed",
          oldValue: oldVal[key],
        });
      } else if (!hasOld && hasNew) {
        differences.push({
          path: keyPath,
          type: "added",
          newValue: newVal[key],
        });
      } else {
        compareValues(oldVal[key], newVal[key], keyPath, differences, ignoreOrder);
      }
    }
    return;
  }
}

export interface DiffOptions {
  ignoreArrayOrder?: boolean;
}

export function compareJson(
  original: unknown,
  compare: unknown,
  options: DiffOptions = {}
): DiffSummary {
  const differences: DiffResult[] = [];
  const { ignoreArrayOrder = false } = options;

  // Handle root-level comparison
  if (isPrimitive(original) && isPrimitive(compare)) {
    if (original !== compare) {
      differences.push({
        path: "$",
        type: "modified",
        oldValue: original,
        newValue: compare,
      });
    }
  } else if (Array.isArray(original) && Array.isArray(compare)) {
    if (ignoreArrayOrder) {
      if (!arraysEqual(original, compare, true)) {
        // Compare element by element for detailed diff
        const maxLen = Math.max(original.length, compare.length);
        for (let i = 0; i < maxLen; i++) {
          const itemPath = `$[${i}]`;
          if (i >= original.length) {
            differences.push({
              path: itemPath,
              type: "added",
              newValue: compare[i],
            });
          } else if (i >= compare.length) {
            differences.push({
              path: itemPath,
              type: "removed",
              oldValue: original[i],
            });
          } else if (!deepEqual(original[i], compare[i], true)) {
            compareValues(original[i], compare[i], itemPath, differences, ignoreArrayOrder);
          }
        }
      }
    } else {
      const maxLen = Math.max(original.length, compare.length);
      for (let i = 0; i < maxLen; i++) {
        const itemPath = `$[${i}]`;
        if (i >= original.length) {
          differences.push({
            path: itemPath,
            type: "added",
            newValue: compare[i],
          });
        } else if (i >= compare.length) {
          differences.push({
            path: itemPath,
            type: "removed",
            oldValue: original[i],
          });
        } else {
          compareValues(original[i], compare[i], itemPath, differences, ignoreArrayOrder);
        }
      }
    }
  } else if (isObject(original) && isObject(compare)) {
    const allKeys = new Set([...Object.keys(original), ...Object.keys(compare)]);

    for (const key of allKeys) {
      const keyPath = `$.${key}`;
      const hasOld = key in original;
      const hasNew = key in compare;

      if (hasOld && !hasNew) {
        differences.push({
          path: keyPath,
          type: "removed",
          oldValue: original[key],
        });
      } else if (!hasOld && hasNew) {
        differences.push({
          path: keyPath,
          type: "added",
          newValue: compare[key],
        });
      } else {
        compareValues(original[key], compare[key], keyPath, differences, ignoreArrayOrder);
      }
    }
  } else {
    // Different root types
    differences.push({
      path: "$",
      type: "modified",
      oldValue: original,
      newValue: compare,
    });
  }

  return {
    differences,
    added: differences.filter(d => d.type === "added").length,
    removed: differences.filter(d => d.type === "removed").length,
    modified: differences.filter(d => d.type === "modified").length,
    unchanged: 0, // We don't track unchanged for performance
  };
}

export function formatValue(value: unknown): string {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "object") {
    const str = JSON.stringify(value);
    if (str.length > 50) {
      return str.substring(0, 47) + "...";
    }
    return str;
  }
  return String(value);
}

export function generateDiffReport(summary: DiffSummary): string {
  const lines: string[] = [];
  lines.push("# JSON Diff Report");
  lines.push("");
  lines.push(`**Summary:** ${summary.differences.length} difference(s)`);
  lines.push(`- Added: ${summary.added}`);
  lines.push(`- Removed: ${summary.removed}`);
  lines.push(`- Modified: ${summary.modified}`);
  lines.push("");
  lines.push("## Changes");
  lines.push("");

  for (const diff of summary.differences) {
    const icon = diff.type === "added" ? "+" : diff.type === "removed" ? "-" : "~";
    let line = `\`${icon}\` **${diff.path}**`;

    if (diff.type === "added") {
      line += ` — added: ${formatValue(diff.newValue)}`;
    } else if (diff.type === "removed") {
      line += ` — removed (was: ${formatValue(diff.oldValue)})`;
    } else {
      line += ` — ${formatValue(diff.oldValue)} → ${formatValue(diff.newValue)}`;
    }

    lines.push(line);
  }

  return lines.join("\n");
}
