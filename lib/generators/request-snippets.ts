/**
 * Request Snippet Generators
 *
 * Generate HTTP request code snippets from JSON payloads.
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface RequestConfig {
  method: HttpMethod;
  url: string;
  headers: RequestHeader[];
  body: string | null;
}

/**
 * Escape string for shell (single quotes)
 */
function shellEscape(str: string): string {
  return str.replace(/'/g, "'\\''");
}

/**
 * Generate cURL command
 */
export function generateCurl(config: RequestConfig): string {
  const parts: string[] = ["curl"];

  // Method (skip for GET as it's default)
  if (config.method !== "GET") {
    parts.push(`-X ${config.method}`);
  }

  // URL
  parts.push(`'${shellEscape(config.url)}'`);

  // Headers
  const enabledHeaders = config.headers.filter((h) => h.enabled && h.key.trim());
  for (const header of enabledHeaders) {
    parts.push(`-H '${shellEscape(header.key)}: ${shellEscape(header.value)}'`);
  }

  // Body (for methods that support it)
  if (config.body && ["POST", "PUT", "PATCH"].includes(config.method)) {
    // Check if Content-Type is set
    const hasContentType = enabledHeaders.some(
      (h) => h.key.toLowerCase() === "content-type"
    );
    if (!hasContentType) {
      parts.push("-H 'Content-Type: application/json'");
    }
    parts.push(`-d '${shellEscape(config.body)}'`);
  }

  // Format with line continuations for readability
  if (parts.length > 3) {
    return parts.join(" \\\n  ");
  }
  return parts.join(" ");
}

/**
 * Generate fetch() code
 */
export function generateFetch(config: RequestConfig): string {
  const options: string[] = [];

  // Method
  options.push(`method: "${config.method}"`);

  // Headers
  const enabledHeaders = config.headers.filter((h) => h.enabled && h.key.trim());
  const headersObj: Record<string, string> = {};

  // Add Content-Type if body exists and not already set
  if (config.body && ["POST", "PUT", "PATCH"].includes(config.method)) {
    const hasContentType = enabledHeaders.some(
      (h) => h.key.toLowerCase() === "content-type"
    );
    if (!hasContentType) {
      headersObj["Content-Type"] = "application/json";
    }
  }

  for (const header of enabledHeaders) {
    headersObj[header.key] = header.value;
  }

  if (Object.keys(headersObj).length > 0) {
    const headerEntries = Object.entries(headersObj)
      .map(([k, v]) => `    "${k}": "${v}"`)
      .join(",\n");
    options.push(`headers: {\n${headerEntries}\n  }`);
  }

  // Body
  if (config.body && ["POST", "PUT", "PATCH"].includes(config.method)) {
    // Pretty print the body for readability
    try {
      const parsed = JSON.parse(config.body);
      const bodyStr = JSON.stringify(parsed, null, 2)
        .split("\n")
        .map((line, i) => (i === 0 ? line : "    " + line))
        .join("\n");
      options.push(`body: JSON.stringify(${bodyStr})`);
    } catch {
      options.push(`body: ${JSON.stringify(config.body)}`);
    }
  }

  const optionsStr = options.map((o) => "  " + o).join(",\n");

  return `fetch("${config.url}", {
${optionsStr}
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error(error));`;
}

/**
 * Generate async/await fetch code
 */
export function generateFetchAsync(config: RequestConfig): string {
  const options: string[] = [];

  // Method
  options.push(`method: "${config.method}"`);

  // Headers
  const enabledHeaders = config.headers.filter((h) => h.enabled && h.key.trim());
  const headersObj: Record<string, string> = {};

  if (config.body && ["POST", "PUT", "PATCH"].includes(config.method)) {
    const hasContentType = enabledHeaders.some(
      (h) => h.key.toLowerCase() === "content-type"
    );
    if (!hasContentType) {
      headersObj["Content-Type"] = "application/json";
    }
  }

  for (const header of enabledHeaders) {
    headersObj[header.key] = header.value;
  }

  if (Object.keys(headersObj).length > 0) {
    const headerEntries = Object.entries(headersObj)
      .map(([k, v]) => `    "${k}": "${v}"`)
      .join(",\n");
    options.push(`headers: {\n${headerEntries}\n  }`);
  }

  // Body
  if (config.body && ["POST", "PUT", "PATCH"].includes(config.method)) {
    try {
      const parsed = JSON.parse(config.body);
      const bodyStr = JSON.stringify(parsed, null, 2)
        .split("\n")
        .map((line, i) => (i === 0 ? line : "    " + line))
        .join("\n");
      options.push(`body: JSON.stringify(${bodyStr})`);
    } catch {
      options.push(`body: ${JSON.stringify(config.body)}`);
    }
  }

  const optionsStr = options.map((o) => "  " + o).join(",\n");

  return `const response = await fetch("${config.url}", {
${optionsStr}
});

const data = await response.json();
console.log(data);`;
}

/**
 * Generate axios code
 */
export function generateAxios(config: RequestConfig): string {
  const methodLower = config.method.toLowerCase();
  const enabledHeaders = config.headers.filter((h) => h.enabled && h.key.trim());

  // Build headers object
  const headersObj: Record<string, string> = {};
  if (config.body && ["POST", "PUT", "PATCH"].includes(config.method)) {
    const hasContentType = enabledHeaders.some(
      (h) => h.key.toLowerCase() === "content-type"
    );
    if (!hasContentType) {
      headersObj["Content-Type"] = "application/json";
    }
  }
  for (const header of enabledHeaders) {
    headersObj[header.key] = header.value;
  }

  // For GET/DELETE without body
  if (!config.body || !["POST", "PUT", "PATCH"].includes(config.method)) {
    if (Object.keys(headersObj).length > 0) {
      const headerEntries = Object.entries(headersObj)
        .map(([k, v]) => `    "${k}": "${v}"`)
        .join(",\n");
      return `axios.${methodLower}("${config.url}", {
  headers: {
${headerEntries}
  }
})
  .then(response => console.log(response.data))
  .catch(error => console.error(error));`;
    }
    return `axios.${methodLower}("${config.url}")
  .then(response => console.log(response.data))
  .catch(error => console.error(error));`;
  }

  // For POST/PUT/PATCH with body
  let bodyStr: string;
  try {
    const parsed = JSON.parse(config.body);
    bodyStr = JSON.stringify(parsed, null, 2)
      .split("\n")
      .map((line, i) => (i === 0 ? line : "  " + line))
      .join("\n");
  } catch {
    bodyStr = JSON.stringify(config.body);
  }

  if (Object.keys(headersObj).length > 0) {
    const headerEntries = Object.entries(headersObj)
      .map(([k, v]) => `    "${k}": "${v}"`)
      .join(",\n");
    return `axios.${methodLower}("${config.url}", ${bodyStr}, {
  headers: {
${headerEntries}
  }
})
  .then(response => console.log(response.data))
  .catch(error => console.error(error));`;
  }

  return `axios.${methodLower}("${config.url}", ${bodyStr})
  .then(response => console.log(response.data))
  .catch(error => console.error(error));`;
}

/**
 * Detect if JSON looks like an API request payload
 * Returns suggested headers based on content
 */
export function suggestHeaders(json: unknown): RequestHeader[] {
  const suggestions: RequestHeader[] = [
    { key: "Content-Type", value: "application/json", enabled: true },
  ];

  if (typeof json === "object" && json !== null) {
    // Check for auth-related fields
    const obj = json as Record<string, unknown>;
    if ("token" in obj || "access_token" in obj || "apiKey" in obj) {
      suggestions.push({
        key: "Authorization",
        value: "Bearer <token>",
        enabled: false,
      });
    }
  }

  return suggestions;
}

/**
 * Get default headers for a new request
 */
export function getDefaultHeaders(): RequestHeader[] {
  return [
    { key: "Content-Type", value: "application/json", enabled: true },
    { key: "", value: "", enabled: true },
  ];
}
