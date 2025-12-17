# JSONT — Development Roadmap

> **Privacy Promise**: All data processing happens in your browser. Nothing leaves your machine. No tracking, no analytics, no server-side processing.

---

## Philosophy Alignment

The PRD outlines a vision that eventually includes authentication, cloud sync, and AI features. However, this roadmap focuses on **Phase 1: Client-Only MVP** — a fully functional, privacy-first JSON tool that requires zero backend.

### What We're Building First
- 100% client-side processing
- No data ever leaves the browser
- No authentication required
- Session-based state (localStorage for persistence across refreshes)
- Export/import for portability

### What We're Deferring
- ~~AI Fix JSON~~ → Requires server-side API calls
- ~~Cloud sync~~ → Requires backend
- ~~Share links~~ → Requires persistence layer
- ~~History with search~~ → Complex backend feature
- ~~Saved mappings (cloud)~~ → Requires auth

---

## Tech Stack Decisions

- **Framework**: Next.js 16 (App Router) — using as SPA, no API routes needed
- **UI**: shadcn/ui (new-york style) + custom components
- **Editor**: Monaco Editor or CodeMirror 6 (TBD based on bundle size)
- **State**: Zustand for global state + localStorage persistence
- **JSON Parsing**: Custom relaxed parser for JS-style objects
- **Styling**: Tailwind CSS 4 + CSS variables for theming

---

## Phase 1: Foundation & Core Editor

### 1.1 Project Setup & Design System
- [x] Set up folder structure (`/components`, `/lib`, `/hooks`, `/stores`)
- [x] Install shadcn components: `button`, `input`, `tabs`, `tooltip`, `dropdown-menu`, `dialog`, `badge`, `separator`, `toast`, `switch`, `label`
- [x] Create color theme (dark mode first, with light mode toggle)
- [x] Design tokens: spacing, typography, border-radius
- [x] Create `<PrivacyBadge />` component — "100% Browser-Only • Your Data Never Leaves"
- [x] Create responsive layout shell with header

### 1.2 JSON Input Editor
- [x] Evaluate and integrate code editor (Monaco vs CodeMirror 6) — **chose CodeMirror 6**
- [x] Large paste-friendly textarea with syntax highlighting
- [x] Line numbers
- [x] Auto-detect JSON on paste
- [x] Handle large inputs (virtualization if needed)
- [x] Editor toolbar: Clear, Paste from clipboard, Load file
- [x] Keyboard shortcut: `Cmd/Ctrl + V` focus on editor
- [x] LocalStorage persistence (restore content on page refresh)

### 1.3 Relaxed JSON Parser
- [x] Create parser that accepts:
  - Valid JSON
  - Single quotes (`'key': 'value'`)
  - Trailing commas (`[1, 2, 3,]`)
  - Comments (`// line` and `/* block */`)
  - Unquoted keys (`{key: "value"}`)
  - JavaScript literals (`undefined`, `NaN`, `Infinity`)
  - Hexadecimal numbers (`0xFF`)
- [x] Detailed error reporting with line/column numbers
- [x] "Convert to JSON" button for JS-style input
- [x] Detection and display of relaxed features used

---

## Phase 2: Format, Validate & Display

### 2.1 Formatting Actions
- [x] Pretty-print (Format button)
- [x] Minify (single line)
- [x] Configurable indent (2/4 spaces, tabs)
- [x] Sort keys (alphabetical, recursive option)
- [x] Keyboard shortcuts for actions
- [x] Format on paste toggle (user preference)

### 2.2 Validation & Error Display
- [x] Real-time validation as user types (debounced 300ms)
- [x] Human-readable error message in status bar
- [x] Line and column number in errors
- [x] Inline error highlighting in editor (wavy underline)
- [x] Success state indicator (green checkmark)
- [x] JSONPath to error location
- [x] "Jump to error" functionality

### 2.3 Tree View
- [x] Toggle between Raw (editor) and Tree view
- [x] Expandable/collapsible nodes
- [x] Collapse all / Expand all
- [x] Collapse to depth N (1, 2, 3, all)
- [x] Visual type indicators (string, number, boolean, null, array, object)
- [x] Array length and object key count badges
- [x] Click node to copy JSONPath
- [x] Click value to copy value
- [x] Hover preview for long strings
- [x] Search within tree (text + regex toggle)
- [x] Highlight matching nodes

---

## Phase 3: Schema & Code Generation

### 3.1 JSON Schema Generation
- [x] Generate JSON Schema draft-07 from document
- [x] Options panel:
  - All fields required vs infer optional
  - Strict mode (additionalProperties: false)
  - Include examples from source
- [x] Output viewer with copy button
- [x] Download as `.json`
- [x] Edit mode for manual schema adjustments

### 3.2 TypeScript Interface Generation
- [x] Generate TypeScript interfaces from JSON
- [x] Options:
  - Interface vs Type alias
  - Optional fields toggle
  - Export keyword toggle
  - Readonly properties toggle
  - Array type inference
  - Naming convention (PascalCase)
- [x] Root type naming input
- [x] Syntax highlighting with CodeMirror
- [x] Edit mode for manual adjustments
- [x] Copy / Download as `.d.ts`

### 3.3 Zod Schema Generation
- [x] Generate Zod schema from JSON
- [x] Options:
  - `nullable()` vs `union()` toggle
  - `strict()` mode toggle
  - Enum detection (repeated string values)
  - DateTime/URL/Email/UUID string detection
  - Field descriptions toggle
- [x] Output with imports (`import { z } from "zod"`)
- [x] Inferred type export
- [x] Edit mode for manual adjustments
- [x] Copy / Download as `.zod.ts`

---

## Phase 4: Utilities & Quick Actions

### 4.1 Encoding/Decoding Tools
- [x] Base64 encode content
- [x] Base64 decode content
- [x] URL encode content
- [x] URL decode content
- [x] Escape JSON string
- [x] Unescape JSON string
- [x] Encode dropdown in toolbar with categorized operations

---

## Phase 5: Array Mapping

### 5.1 Map Array Dialog
- [x] Detect arrays of objects in tree view
- [x] "Map Array" action (toolbar menu)
- [x] Dialog with field list + live preview
- [x] Field selection (checkboxes)
- [x] Field renaming (inline edit)
- [x] Live JSON preview
- [x] Copy JSON result
- [x] Copy as JavaScript `.map()` code
- [x] Download result

### 5.2 Advanced Mapping (Deferred)
- [ ] Field reordering (drag & drop)
- [ ] Nested field flattening (`user.address.city` → `city`)
- [ ] Simple filters (`where status === "active"`)
- [ ] Value transforms (uppercase, trim, etc.)

---

## Phase 6: Request & Snippet Generation

### 6.1 Request Builder
- [ ] HTTP method selector (GET, POST, PUT, PATCH, DELETE)
- [ ] URL input with validation
- [ ] Headers editor (key-value pairs)
- [ ] Link body to current document
- [ ] Request preview

### 6.2 Code Export
- [ ] Generate cURL command
- [ ] Generate `fetch()` code
- [ ] Generate `axios` code
- [ ] Generate `ky` code
- [ ] Copy with syntax highlighting preview

### 6.3 Smart Suggestions
- [ ] If JSON looks like API payload → suggest POST body usage
- [ ] If JSON has common patterns → suggest appropriate headers

---

## Phase 7: Diff & Comparison

### 7.1 In-Session Diff
- [ ] Track original input vs current state
- [ ] "Show changes" toggle
- [ ] Side-by-side diff view
- [ ] Inline diff view (unified)
- [ ] Change highlighting (additions, deletions, modifications)

### 7.2 Compare Two JSONs
- [ ] "Compare" mode: paste two JSONs
- [ ] Side-by-side comparison
- [ ] Structural diff (ignore formatting)
- [ ] Value-only diff
- [ ] Highlight differences
- [ ] Navigate between differences

---

## Phase 8: UX Polish & Advanced Features

### 8.1 Keyboard Shortcuts
- [ ] Global shortcut system
- [ ] Command palette (`Cmd/Ctrl + K`)
- [ ] Shortcuts:
  - `Cmd + Enter` — Format
  - `Cmd + Shift + M` — Minify
  - `Cmd + Shift + T` — Toggle tree view
  - `Cmd + Shift + C` — Copy formatted
  - `Escape` — Clear / Exit mode
- [ ] Shortcuts help modal

### 8.2 Preferences & Persistence
- [ ] Settings panel:
  - Theme (dark/light/system)
  - Default indent size
  - Format on paste
  - Editor font size
- [ ] Persist to localStorage
- [ ] Export/Import settings

### 8.3 Session History
- [ ] In-memory history of recent documents (last 10)
- [ ] Quick switcher
- [ ] Clear history button
- [ ] Note: Session-only, cleared on tab close

### 8.4 Final Polish
- [ ] Loading states and skeletons
- [ ] Empty states with helpful prompts
- [ ] Toast notifications for actions
- [ ] Error boundaries
- [ ] Mobile-responsive layout (read-only friendly)
- [ ] Performance optimization (large JSON handling)
- [ ] Accessibility audit (ARIA, focus management)

---

## Phase 9: Launch Prep

### 9.1 Documentation
- [ ] Usage tips in-app
- [ ] Keyboard shortcuts reference
- [ ] Privacy policy page (simple: "we store nothing")

### 9.2 Meta & SEO
- [ ] OpenGraph tags
- [ ] Favicon and app icons
- [ ] Meta description
- [ ] Structured data

### 9.3 Analytics-Free Launch
- [ ] No tracking scripts
- [ ] No cookies
- [ ] Clean network tab (badge of honor)

---

## Deferred Features (Post-MVP)

These require backend infrastructure and are explicitly out of scope for Phase 1:

| Feature | Reason Deferred |
|---------|-----------------|
| AI Fix JSON | Requires API calls to LLM |
| Cloud History | Requires database |
| Share Links | Requires URL shortener + storage |
| Team Workspaces | Requires auth + permissions |
| Saved Mappings (cloud) | Requires user accounts |

---

## Design Principles

1. **Speed over features** — Every interaction should feel instant
2. **No dead ends** — Always show what the user can do next
3. **Honest feedback** — Clear errors, no vague messages
4. **Keyboard first** — Power users shouldn't need a mouse
5. **Dark mode default** — Developers live in dark mode
6. **Zero config start** — Paste and go, settings are optional

---

## Suggested Taglines

- "JSON tools that respect your privacy. 100% browser-based."
- "Your JSON never leaves your browser."
- "Zero servers. Zero tracking. Just JSON."
- "Client-side JSON tools for developers who care about privacy."

---

## Next Steps

Ready to start? Begin with **Phase 1.1** — setting up the design system and installing shadcn components. This foundation will make everything else faster to build.
