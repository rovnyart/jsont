/**
 * Sort object keys alphabetically
 */
export function sortKeys(
  data: unknown,
  recursive: boolean = false
): unknown {
  if (data === null || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    if (recursive) {
      return data.map((item) => sortKeys(item, true));
    }
    return data;
  }

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(data).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  for (const key of keys) {
    const value = (data as Record<string, unknown>)[key];
    sorted[key] = recursive ? sortKeys(value, true) : value;
  }

  return sorted;
}
