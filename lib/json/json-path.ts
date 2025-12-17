/**
 * Compute JSONPath from a position in the JSON text.
 * This parses the JSON structure up to the given position to determine the path.
 */
export function getJsonPathAtPosition(text: string, position: number): string {
  const path: (string | number)[] = [];
  const stack: Array<{ type: "object" | "array"; key?: string }> = [];

  let i = 0;
  let inString = false;
  let stringChar = "";
  let currentKey = "";
  let collectingKey = false;
  let afterColon = false;
  let arrayIndex = 0;

  while (i < position && i < text.length) {
    const char = text[i];

    // Handle string content
    if (inString) {
      if (char === "\\" && i + 1 < text.length) {
        if (collectingKey) currentKey += char + text[i + 1];
        i += 2;
        continue;
      }
      if (char === stringChar) {
        inString = false;
        if (collectingKey) {
          collectingKey = false;
        }
      } else if (collectingKey) {
        currentKey += char;
      }
      i++;
      continue;
    }

    // Handle string start
    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
      // If we're in an object and haven't seen a colon yet, this is a key
      if (
        stack.length > 0 &&
        stack[stack.length - 1].type === "object" &&
        !afterColon
      ) {
        collectingKey = true;
        currentKey = "";
      }
      i++;
      continue;
    }

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Skip comments
    if (char === "/" && i + 1 < text.length) {
      if (text[i + 1] === "/") {
        // Line comment
        while (i < text.length && text[i] !== "\n") i++;
        continue;
      }
      if (text[i + 1] === "*") {
        // Block comment
        i += 2;
        while (i < text.length - 1 && !(text[i] === "*" && text[i + 1] === "/"))
          i++;
        i += 2;
        continue;
      }
    }

    // Handle structural characters
    if (char === "{") {
      if (stack.length > 0 && stack[stack.length - 1].type === "array") {
        path.push(arrayIndex);
      }
      stack.push({ type: "object" });
      afterColon = false;
      i++;
      continue;
    }

    if (char === "[") {
      if (stack.length > 0 && stack[stack.length - 1].type === "array") {
        path.push(arrayIndex);
      }
      stack.push({ type: "array" });
      arrayIndex = 0;
      afterColon = false;
      i++;
      continue;
    }

    if (char === "}") {
      if (stack.length > 0) {
        stack.pop();
        if (path.length > 0) path.pop();
      }
      afterColon = false;
      i++;
      continue;
    }

    if (char === "]") {
      if (stack.length > 0) {
        stack.pop();
        if (path.length > 0) path.pop();
        // Restore parent array index if we're back in an array
        if (stack.length > 0 && stack[stack.length - 1].type === "array") {
          arrayIndex =
            typeof path[path.length - 1] === "number"
              ? (path[path.length - 1] as number)
              : 0;
        }
      }
      afterColon = false;
      i++;
      continue;
    }

    if (char === ":") {
      afterColon = true;
      if (currentKey) {
        path.push(currentKey);
        currentKey = "";
      }
      i++;
      continue;
    }

    if (char === ",") {
      afterColon = false;
      if (path.length > 0 && stack.length > 0) {
        const current = stack[stack.length - 1];
        if (current.type === "object") {
          path.pop();
        } else if (current.type === "array") {
          path.pop();
          arrayIndex++;
        }
      } else if (stack.length > 0 && stack[stack.length - 1].type === "array") {
        arrayIndex++;
      }
      i++;
      continue;
    }

    // Handle unquoted keys (JS-style)
    if (
      stack.length > 0 &&
      stack[stack.length - 1].type === "object" &&
      !afterColon &&
      /[a-zA-Z_$]/.test(char)
    ) {
      currentKey = "";
      while (i < text.length && /[a-zA-Z0-9_$]/.test(text[i])) {
        currentKey += text[i];
        i++;
      }
      continue;
    }

    // For array values, track the index when we start a value
    if (
      stack.length > 0 &&
      stack[stack.length - 1].type === "array" &&
      path[path.length - 1] !== arrayIndex
    ) {
      // We're starting a new array value
      if (
        /[0-9\-"'tfnuNI\[{]/.test(char) ||
        /[a-zA-Z_$]/.test(char)
      ) {
        path.push(arrayIndex);
      }
    }

    i++;
  }

  // Build JSONPath string
  if (path.length === 0) {
    return "$";
  }

  return (
    "$" +
    path
      .map((segment) => {
        if (typeof segment === "number") {
          return `[${segment}]`;
        }
        // Use dot notation for simple keys, bracket notation for complex ones
        if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(segment)) {
          return `.${segment}`;
        }
        return `["${segment.replace(/"/g, '\\"')}"]`;
      })
      .join("")
  );
}
