// YAML generator - converts JSON data to YAML format

export interface YamlOptions {
  indent: number;
  quotingType: "single" | "double";
  forceQuotes: boolean;
}

export const defaultYamlOptions: YamlOptions = {
  indent: 2,
  quotingType: "single",
  forceQuotes: false,
};

/**
 * Convert JSON data to YAML string
 */
export function generateYaml(data: unknown, options: YamlOptions = defaultYamlOptions): string {
  const { indent, quotingType, forceQuotes } = options;
  const quote = quotingType === "single" ? "'" : '"';

  function needsQuoting(value: string): boolean {
    if (forceQuotes) return true;

    // Check if value needs quoting
    if (value === "") return true;
    if (value === "true" || value === "false") return true;
    if (value === "null" || value === "~") return true;
    if (value === "yes" || value === "no") return true;
    if (value === "on" || value === "off") return true;
    if (/^[0-9]/.test(value)) return true;
    if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(value)) return true;
    if (value.includes(": ") || value.includes(" #")) return true;
    if (value.includes("\n")) return true;
    if (/^\s|\s$/.test(value)) return true;

    return false;
  }

  function escapeString(value: string): string {
    if (quotingType === "single") {
      return value.replace(/'/g, "''");
    } else {
      return value
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t");
    }
  }

  function formatValue(value: unknown, level: number): string {
    const indentStr = " ".repeat(indent * level);
    const childIndent = " ".repeat(indent * (level + 1));

    if (value === null) {
      return "null";
    }

    if (value === undefined) {
      return "null";
    }

    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }

    if (typeof value === "number") {
      if (Number.isNaN(value)) return ".nan";
      if (!Number.isFinite(value)) return value > 0 ? ".inf" : "-.inf";
      return String(value);
    }

    if (typeof value === "string") {
      // Handle multi-line strings
      if (value.includes("\n")) {
        const lines = value.split("\n");
        return "|\n" + lines.map(line => childIndent + line).join("\n");
      }

      if (needsQuoting(value)) {
        return quote + escapeString(value) + quote;
      }
      return value;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return "[]";
      }

      const items = value.map((item) => {
        const formatted = formatValue(item, level + 1);

        // Check if it's a complex value (object or array)
        if (typeof item === "object" && item !== null) {
          if (Array.isArray(item)) {
            return `${indentStr}-${formatted.startsWith("\n") ? "" : " "}${formatted.trimStart()}`;
          }
          // Object - put first key on same line as dash
          const lines = formatted.split("\n");
          if (lines.length > 0) {
            return `${indentStr}- ${lines[0].trimStart()}\n${lines.slice(1).map(l => indentStr + "  " + l.trimStart()).join("\n")}`.replace(/\n+$/, "");
          }
        }

        return `${indentStr}- ${formatted}`;
      });

      return "\n" + items.join("\n");
    }

    if (typeof value === "object") {
      const entries = Object.entries(value);

      if (entries.length === 0) {
        return "{}";
      }

      const items = entries.map(([key, val]) => {
        // Quote key if needed
        const formattedKey = needsQuoting(key) ? quote + escapeString(key) + quote : key;
        const formattedValue = formatValue(val, level + 1);

        // Check if value starts with newline (complex type)
        if (formattedValue.startsWith("\n")) {
          return `${indentStr}${formattedKey}:${formattedValue}`;
        }

        return `${indentStr}${formattedKey}: ${formattedValue}`;
      });

      return (level === 0 ? "" : "\n") + items.join("\n");
    }

    return String(value);
  }

  return formatValue(data, 0);
}
