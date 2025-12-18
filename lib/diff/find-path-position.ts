/**
 * Find the line number and character position for a JSONPath in a JSON string.
 * Returns the position of the key (for objects) or index (for arrays).
 */
export interface PathPosition {
  line: number; // 0-indexed
  column: number;
  startOffset: number;
  endOffset: number;
}

/**
 * Parse a JSONPath like "$.users[0].name" into segments
 */
function parseJsonPath(path: string): (string | number)[] {
  const segments: (string | number)[] = [];

  // Remove leading $
  let remaining = path.startsWith("$") ? path.slice(1) : path;

  while (remaining.length > 0) {
    if (remaining.startsWith(".")) {
      remaining = remaining.slice(1);
      // Read key until next . or [
      const match = remaining.match(/^([^.\[]+)/);
      if (match) {
        segments.push(match[1]);
        remaining = remaining.slice(match[1].length);
      }
    } else if (remaining.startsWith("[")) {
      // Read array index
      const match = remaining.match(/^\[(\d+)\]/);
      if (match) {
        segments.push(parseInt(match[1], 10));
        remaining = remaining.slice(match[0].length);
      } else {
        break;
      }
    } else {
      // Handle case where path starts with a key (no leading dot)
      const match = remaining.match(/^([^.\[]+)/);
      if (match) {
        segments.push(match[1]);
        remaining = remaining.slice(match[1].length);
      } else {
        break;
      }
    }
  }

  return segments;
}

/**
 * Find position in JSON string for a given path
 */
export function findPathPosition(jsonString: string, path: string): PathPosition | null {
  const segments = parseJsonPath(path);

  if (segments.length === 0) {
    // Root path - return start of document
    return { line: 0, column: 0, startOffset: 0, endOffset: 0 };
  }

  let currentPos = 0;
  const lines = jsonString.split("\n");

  // Helper to get line and column from offset
  function getLineCol(offset: number): { line: number; column: number } {
    let remaining = offset;
    for (let i = 0; i < lines.length; i++) {
      if (remaining <= lines[i].length) {
        return { line: i, column: remaining };
      }
      remaining -= lines[i].length + 1; // +1 for newline
    }
    return { line: lines.length - 1, column: 0 };
  }

  // For each segment, find its position in the JSON
  for (let segIdx = 0; segIdx < segments.length; segIdx++) {
    const segment = segments[segIdx];
    const isLast = segIdx === segments.length - 1;

    if (typeof segment === "string") {
      // Looking for a key in an object
      // Find the key pattern: "key":
      const keyPattern = new RegExp(`"${escapeRegex(segment)}"\\s*:`);
      const searchFrom = currentPos;
      const match = jsonString.slice(searchFrom).match(keyPattern);

      if (!match || match.index === undefined) {
        return null;
      }

      const keyStart = searchFrom + match.index;
      const keyEnd = keyStart + match[0].length;

      if (isLast) {
        const { line, column } = getLineCol(keyStart);
        return { line, column, startOffset: keyStart, endOffset: keyEnd };
      }

      // Move position past the colon to the value
      currentPos = keyEnd;

    } else if (typeof segment === "number") {
      // Looking for an array index
      // Find the opening bracket first, then count elements
      const bracketPos = jsonString.indexOf("[", currentPos);
      if (bracketPos === -1) return null;

      currentPos = bracketPos + 1;
      let elementIndex = 0;
      let elementStart = currentPos;

      // Skip whitespace
      while (currentPos < jsonString.length && /\s/.test(jsonString[currentPos])) {
        currentPos++;
      }
      elementStart = currentPos;

      while (currentPos < jsonString.length && elementIndex < segment) {
        // Skip to next element (handling nested structures)
        const char = jsonString[currentPos];

        if (char === "{" || char === "[") {
          // Skip nested structure
          currentPos = skipNested(jsonString, currentPos);
        } else if (char === '"') {
          // Skip string
          currentPos = skipString(jsonString, currentPos);
        } else if (char === ",") {
          elementIndex++;
          currentPos++;
          // Skip whitespace to find start of next element
          while (currentPos < jsonString.length && /\s/.test(jsonString[currentPos])) {
            currentPos++;
          }
          elementStart = currentPos;
        } else {
          currentPos++;
        }
      }

      if (elementIndex !== segment) {
        return null;
      }

      if (isLast) {
        const { line, column } = getLineCol(elementStart);
        // Find the end of this element
        let endPos = elementStart;
        const char = jsonString[elementStart];
        if (char === "{" || char === "[") {
          endPos = skipNested(jsonString, elementStart);
        } else if (char === '"') {
          endPos = skipString(jsonString, elementStart);
        } else {
          // Primitive - find end
          while (endPos < jsonString.length && !/[,\]\}]/.test(jsonString[endPos])) {
            endPos++;
          }
        }
        return { line, column, startOffset: elementStart, endOffset: endPos };
      }

      currentPos = elementStart;
    }
  }

  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function skipNested(str: string, start: number): number {
  const open = str[start];
  const close = open === "{" ? "}" : "]";
  let depth = 1;
  let pos = start + 1;

  while (pos < str.length && depth > 0) {
    const char = str[pos];
    if (char === '"') {
      pos = skipString(str, pos);
      continue;
    }
    if (char === open) depth++;
    if (char === close) depth--;
    pos++;
  }

  return pos;
}

function skipString(str: string, start: number): number {
  let pos = start + 1;
  while (pos < str.length) {
    if (str[pos] === "\\") {
      pos += 2; // Skip escaped character
    } else if (str[pos] === '"') {
      return pos + 1;
    } else {
      pos++;
    }
  }
  return pos;
}
