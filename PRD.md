# JSONT — Product Requirements Document (PRD)

## 1. Overview

JSONT is a developer-first web tool for working with JSON and "JSON-like" data.
Its core purpose is to make malformed, large, or complex JSON easy to understand, fix, transform, and reuse.

Primary philosophy:
Paste → Understand → Fix → Shape → Reuse

JSONT starts as a single-page tool but is designed to grow into a stateful application
with authentication, history, saved mappings, and shareable artifacts.

---

## 2. Target Audience

Primary users:
- Backend / Fullstack developers
- Frontend developers debugging API responses
- DevOps / SRE engineers working with logs
- Power users who frequently paste JSON into browser consoles

Non-goals:
- Beginner education
- Non-technical users
- Marketing-heavy workflows

---

## 3. Technical Constraints

- Framework: Next.js (App Router)
- Hosting: Vercel
- Runtime:
  - Client-side for parsing, formatting, mapping
  - Server-side only for AI features and persistence
- Database: PostgreSQL (via Prisma)
- Auth: OAuth (Google, GitHub)
- Local-first UX with optional cloud sync

---

## 4. Core Concepts

### 4.1 Document

A Document is the central entity in JSONT.
Everything operates on or derives from a Document.

A Document represents:
- Raw pasted JSON / JSON-like input
- One or more processed versions (formatted, fixed, mapped)

---

### 4.2 Local-first State

Without login:
- Documents live in browser storage
- Full functionality is available

With login:
- Documents sync to the backend
- History, search, sharing, and persistence unlock

---

## 5. Core Features (MVP)

### 5.1 JSON Input

- Large paste-friendly editor
- Supports:
  - Valid JSON
  - Invalid JSON
  - JS-style objects (single quotes, trailing commas, comments)
- Auto-format on paste (toggle)

---

### 5.2 Format & Validate

Actions:
- Format (pretty-print)
- Minify
- Validate

Validation output:
- Human-readable error
- Path to error (JSONPath-like)
- Inline highlighting

---

### 5.3 Tree View

- Toggle between Raw and Tree view
- Expand / collapse nodes
- Collapse by depth
- Click field to copy JSONPath
- Search (text / regex)

---

## 6. AI Features

### 6.1 AI Fix JSON

When input is invalid:
- Button: Fix with AI
- Modes:
  - Safe (minimal fixes)
  - Aggressive (best-effort recovery)

Output:
- Fixed JSON
- Diff vs original
- Optional explanation of changes

---

## 7. Schema & Code Generation

### 7.1 JSON Schema

- Generate JSON Schema from current document
- Options:
  - All required vs inferred optional
  - Strict mode

---

### 7.2 Zod Schema

- Generate Zod schema from JSON
- Options:
  - nullable vs union
  - strict()
  - enum detection
  - datetime detection

Output:
- View
- Copy
- Download as .ts

---

## 8. Mapping & Transformation (Key Feature)

### 8.1 Mapping Philosophy

Mapping should require no JavaScript knowledge.
The user describes WHAT to extract, not HOW to compute it.

---

### 8.2 Mapping UI

Triggered from Tree View:
- Select an array node
- Enter Mapping Mode

Mapping steps:
1. Select fields
2. Optional filters (field + operator + value)
3. Optional transforms (type, casing, defaults)

Live output preview is always visible.

---

### 8.3 Power Mode

Optional expression mode:
- Simple expressions only
- No full JS execution
- Sandboxed evaluation

---

### 8.4 Output

- Result JSON preview
- Copy as:
  - JSON
  - JavaScript (map/filter)
  - TypeScript
  - JSONPath result

---

## 9. Request & Snippet Generation

### 9.1 Request Builder

- Method
- URL
- Headers
- Body (linked to Document)

Exports:
- cURL (Postman-compatible)
- fetch
- axios

---

### 9.2 From JSON Shortcut

If JSON exists:
- Suggest usage as POST body
- Auto-generate request snippet

---

## 10. Diff & Versioning

- Diff between:
  - Original vs fixed
  - Any saved versions
- Side-by-side comparison
- Visual change highlighting

---

## 11. Stateful Features (Post-MVP Ready)

### 11.1 History

- Saved documents
- Auto-titles
- Pin / favorite
- Full-text search

---

### 11.2 Saved Mappings

- Named reusable mappings
- Apply to compatible documents
- Export / import mappings

---

### 11.3 Share Links

- Read-only access
- Optional expiration
- Optional password
- Redaction before sharing

---

## 12. UX Principles

- Zero onboarding
- No forced auth
- Fast interactions
- Keyboard-friendly
- Dark mode first
- Minimal, developer-centric copy

Tone:
- Honest
- Slightly humorous
- No marketing fluff

---

## 13. Future Extensions (Out of Scope)

- Team workspaces
- CSV / YAML support
- Browser extension
- Desktop app

---

## 14. Success Criteria

Primary:
- The author stops using browser DevTools for JSON mapping.

Secondary:
- Tool becomes part of daily development workflow.
