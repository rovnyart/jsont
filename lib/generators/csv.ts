// CSV generator - converts JSON arrays to CSV format using PapaParse

import Papa from "papaparse";

export interface CsvOptions {
  delimiter: "," | ";" | "\t" | "|";
  quotes: boolean;
  quoteChar: '"' | "'";
  header: boolean;
  newline: "\r\n" | "\n";
  skipEmptyLines: boolean;
  flattenObjects: boolean;
  flattenArrays: boolean;
  nullValue: string;
}

export const defaultCsvOptions: CsvOptions = {
  delimiter: ",",
  quotes: false,
  quoteChar: '"',
  header: true,
  newline: "\r\n",
  skipEmptyLines: true,
  flattenObjects: true,
  flattenArrays: false,
  nullValue: "",
};

/**
 * Check if data is a valid array that can be exported to CSV
 */
export function isExportableArray(data: unknown): data is unknown[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return false;

  // Check if it's an array of objects or primitives
  return data.some(item =>
    item !== null &&
    (typeof item === "object" || typeof item === "string" || typeof item === "number" || typeof item === "boolean")
  );
}

/**
 * Flatten nested objects with dot notation
 */
function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Prepare data for CSV export
 */
function prepareData(data: unknown[], options: CsvOptions): Record<string, unknown>[] {
  return data.map(item => {
    // Handle primitives
    if (item === null || item === undefined) {
      return { value: options.nullValue };
    }

    if (typeof item !== "object") {
      return { value: item };
    }

    // Handle arrays as items
    if (Array.isArray(item)) {
      if (options.flattenArrays) {
        const result: Record<string, unknown> = {};
        item.forEach((val, idx) => {
          result[`[${idx}]`] = val === null || val === undefined ? options.nullValue : val;
        });
        return result;
      }
      return { value: JSON.stringify(item) };
    }

    // Handle objects
    let obj = item as Record<string, unknown>;

    if (options.flattenObjects) {
      obj = flattenObject(obj);
    }

    // Convert values
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        result[key] = options.nullValue;
      } else if (typeof value === "object") {
        // Stringify remaining nested objects/arrays
        result[key] = JSON.stringify(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  });
}

/**
 * Get all unique column headers from the data
 */
export function extractHeaders(data: unknown[]): string[] {
  const headers = new Set<string>();

  for (const item of data) {
    if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      const flattened = flattenObject(item as Record<string, unknown>);
      Object.keys(flattened).forEach(key => headers.add(key));
    }
  }

  return Array.from(headers);
}

/**
 * Convert JSON array to CSV string
 */
export function generateCsv(data: unknown[], options: CsvOptions = defaultCsvOptions): string {
  if (!isExportableArray(data)) {
    throw new Error("Data must be a non-empty array");
  }

  const preparedData = prepareData(data, options);

  const csv = Papa.unparse(preparedData, {
    delimiter: options.delimiter,
    quotes: options.quotes,
    quoteChar: options.quoteChar,
    header: options.header,
    newline: options.newline,
    skipEmptyLines: options.skipEmptyLines,
  });

  return csv;
}

/**
 * Get delimiter display name
 */
export function getDelimiterName(delimiter: CsvOptions["delimiter"]): string {
  switch (delimiter) {
    case ",": return "Comma";
    case ";": return "Semicolon";
    case "\t": return "Tab";
    case "|": return "Pipe";
    default: return delimiter;
  }
}
