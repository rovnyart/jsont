# { json't }

**parse · format · ship**

A privacy-first JSON toolkit that runs entirely in your browser. No servers, no tracking, no data collection. Just powerful JSON tools.

**[Try it now → jsont.dev](https://jsont.dev)**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Why jsont?

Every JSON tool out there wants your data. They upload it to servers, run it through APIs, store it in databases. **jsont is different.**

- **100% client-side** — All processing happens in your browser
- **Zero data transmission** — Your JSON never leaves your machine
- **No accounts required** — Just open and use
- **No tracking** — No analytics, no cookies, no fingerprinting

Open DevTools, check the Network tab. You'll see nothing but static assets. That's a feature.

---

## Features

### Core Editor
- **Syntax highlighting** with CodeMirror 6
- **Line numbers** and code folding
- **Drag & drop** file support
- **LocalStorage persistence** — your work survives page refreshes
- **Large file support** with virtualized rendering

### Relaxed JSON Parser
Not all JSON is created equal. jsont accepts:
- Single quotes (`'key': 'value'`)
- Trailing commas (`[1, 2, 3,]`)
- Comments (`// line` and `/* block */`)
- Unquoted keys (`{key: "value"}`)
- JavaScript literals (`undefined`, `NaN`, `Infinity`)
- Hexadecimal numbers (`0xFF`)
- **YAML format** — paste YAML directly, it converts to JSON automatically

One click converts it all to valid JSON.

### Formatting & Validation
- **Pretty-print** with configurable indentation (2/4 spaces, tabs)
- **Minify** to single line
- **Sort keys** alphabetically (top-level or recursive)
- **Real-time validation** with human-readable errors
- **Jump to error** — click the error message to navigate
- **JSONPath display** for error locations

### JSON Repair
Paste broken JSON and click **"Try to Fix"**. The repair engine handles:
- Missing quotes around keys/values
- Missing commas and colons
- Unclosed strings, arrays, objects
- Python constants (`True`, `False`, `None`)
- Trailing commas
- Unescaped control characters

### Tree View
- **Expand/collapse** individual nodes or entire tree
- **Collapse to depth** (1, 2, 3, or all levels)
- **Type indicators** for strings, numbers, booleans, null, arrays, objects
- **Size badges** showing array length and object key count
- **Click to copy** JSONPath or values
- **Search** with text or regex matching
- **Hover preview** for long strings

### Code Generation
Generate type-safe code from your JSON:

**TypeScript Interfaces**
- Interface vs Type alias
- Optional/required fields
- Export keyword toggle
- Readonly properties
- Custom root type naming

**Zod Schemas**
- Strict mode support
- Nullable handling
- String format detection (DateTime, URL, Email, UUID)
- Inferred type export

**TypeBox Schemas**
- `@sinclair/typebox` compatible output
- Format detection (email, uri, uuid, date-time)
- Integer vs Number inference
- Static type inference with `Static<typeof Schema>`
- Configurable schema naming

**JSON Schema**
- Draft-07 compliant
- Required vs optional inference
- Strict mode (additionalProperties: false)
- Examples from source data

**YAML Export**
- Convert JSON to YAML format
- Configurable indentation (2/4 spaces)
- Quote style options (single/double)
- Force quotes toggle

### Array Mapping
Transform arrays of objects with a visual mapper:
- Select which fields to include
- Rename fields inline
- Live preview of results
- Export as JSON or JavaScript `.map()` code

### JSON Compare
Side-by-side comparison of two JSON documents:
- **Visual diff highlighting** — added, removed, and modified values
- **Ignore array order** — compare arrays as sets
- **Click to jump** — navigate directly to differences
- **Diff summary** — count of changes by type
- **Paste or type** — compare any two JSON structures

### Request Builder
Build HTTP requests with your JSON as the body:
- Method selector (GET, POST, PUT, PATCH, DELETE)
- Custom headers with enable/disable toggles
- Generate **cURL**, **fetch**, or **axios** code
- Syntax-highlighted preview

### Encoding Tools
Quick transformations in the toolbar:
- Base64 encode/decode
- URL encode/decode
- JSON string escape/unescape

### CSV Export
Export JSON arrays to CSV format for spreadsheets:
- **Multiple delimiters** — comma, semicolon, tab, pipe
- **Configurable quoting** — quote all fields or auto-detect
- **Flatten nested objects** — `user.name` becomes a column
- **Header row toggle** — include or exclude column names
- **Line ending options** — CRLF (Windows) or LF (Unix)
- **Copy or download** — get your CSV instantly

### Random JSON Generator
Generate realistic test data with [Faker.js](https://fakerjs.dev/):
- **Multiple data types** — users, products, orders, blog posts, and more
- **Size presets** — small (5 items), medium (50 items), large (1000 items)
- **Root type selection** — generate as object or array
- **Realistic data** — names, emails, addresses, UUIDs, dates, prices
- **Nested structures** — includes related objects and arrays

---

## Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Format | `⌘ + Enter` | `Ctrl + Enter` |
| Minify | `⌘ + Shift + M` | `Ctrl + Shift + M` |
| Copy | `⌘ + Shift + C` | `Ctrl + Shift + C` |
| Toggle Tree View | `⌘ + Shift + T` | `Ctrl + Shift + T` |
| Sort Keys | `⌘ + Shift + S` | `Ctrl + Shift + S` |

---

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Editor**: [CodeMirror 6](https://codemirror.net/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide](https://lucide.dev/)

---

## Development

```bash
# Clone the repository
git clone https://github.com/rovnyart/jsont.git
cd jsont

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Privacy Policy

**We don't have one because we don't collect anything.**

- No cookies
- No analytics
- No telemetry
- No server-side processing
- No data transmission

Your JSON stays in your browser. Period.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <sub>Built with care by <a href="https://github.com/rovnyart">rovnyart</a></sub>
</p>
