import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Dark theme colors (matches shadcn neutral dark)
const darkColors = {
  background: "oklch(0.145 0 0)", // --background dark
  foreground: "oklch(0.985 0 0)", // --foreground dark
  selection: "oklch(0.269 0 0)", // --muted dark
  cursor: "oklch(0.985 0 0)",
  activeLine: "oklch(0.205 0 0)", // --card dark
  lineNumbers: "oklch(0.556 0 0)", // --muted-foreground dark
  matchingBracket: "oklch(0.488 0.243 264.376)", // --chart-1 dark (blue)
  // Syntax colors
  string: "oklch(0.696 0.17 162.48)", // --chart-2 dark (teal/green)
  number: "oklch(0.769 0.188 70.08)", // --chart-3 dark (yellow/orange)
  keyword: "oklch(0.627 0.265 303.9)", // --chart-4 dark (purple)
  property: "oklch(0.488 0.243 264.376)", // blue
  null: "oklch(0.645 0.246 16.439)", // --chart-5 dark (red/pink)
  boolean: "oklch(0.627 0.265 303.9)", // purple
};

// Light theme colors
const lightColors = {
  background: "oklch(1 0 0)",
  foreground: "oklch(0.145 0 0)",
  selection: "oklch(0.97 0 0)",
  cursor: "oklch(0.145 0 0)",
  activeLine: "oklch(0.985 0 0)",
  lineNumbers: "oklch(0.556 0 0)",
  matchingBracket: "oklch(0.646 0.222 41.116)",
  string: "oklch(0.5 0.15 160)",
  number: "oklch(0.55 0.2 40)",
  keyword: "oklch(0.5 0.25 300)",
  property: "oklch(0.5 0.2 250)",
  null: "oklch(0.55 0.2 20)",
  boolean: "oklch(0.5 0.25 300)",
};

function createTheme(colors: typeof darkColors, isDark: boolean) {
  return EditorView.theme(
    {
      "&": {
        color: colors.foreground,
        backgroundColor: colors.background,
        fontSize: "14px",
        fontFamily: "var(--font-geist-mono), monospace",
      },
      ".cm-content": {
        caretColor: colors.cursor,
        padding: "12px 0",
      },
      ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: colors.cursor,
        borderLeftWidth: "2px",
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        {
          backgroundColor: colors.selection,
        },
      ".cm-activeLine": {
        backgroundColor: colors.activeLine,
      },
      ".cm-gutters": {
        backgroundColor: colors.background,
        color: colors.lineNumbers,
        border: "none",
        paddingRight: "8px",
      },
      ".cm-activeLineGutter": {
        backgroundColor: colors.activeLine,
        color: colors.foreground,
      },
      ".cm-lineNumbers .cm-gutterElement": {
        padding: "0 8px 0 16px",
        minWidth: "40px",
      },
      "&.cm-focused .cm-matchingBracket": {
        backgroundColor: `color-mix(in oklch, ${colors.matchingBracket} 30%, transparent)`,
        outline: `1px solid ${colors.matchingBracket}`,
      },
      ".cm-foldPlaceholder": {
        backgroundColor: colors.selection,
        border: "none",
        color: colors.lineNumbers,
        padding: "0 8px",
        borderRadius: "4px",
      },
      ".cm-tooltip": {
        backgroundColor: colors.background,
        border: `1px solid ${colors.selection}`,
        borderRadius: "6px",
      },
      ".cm-tooltip-autocomplete": {
        "& > ul > li[aria-selected]": {
          backgroundColor: colors.selection,
        },
      },
      // Scrollbar styling
      ".cm-scroller": {
        overflow: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: `${colors.lineNumbers} transparent`,
      },
      // Lint error styling
      ".cm-lintRange-error": {
        backgroundImage: "none",
        textDecoration: "wavy underline",
        textDecorationColor: isDark ? "oklch(0.704 0.191 22.216)" : "oklch(0.577 0.245 27.325)",
        textUnderlineOffset: "3px",
      },
      ".cm-lint-marker-error": {
        content: '""',
      },
      ".cm-lintPoint-error:after": {
        borderBottomColor: isDark ? "oklch(0.704 0.191 22.216)" : "oklch(0.577 0.245 27.325)",
      },
      ".cm-diagnostic-error": {
        borderLeftColor: isDark ? "oklch(0.704 0.191 22.216)" : "oklch(0.577 0.245 27.325)",
      },
      ".cm-panel.cm-panel-lint ul [aria-selected]": {
        backgroundColor: colors.selection,
      },
    },
    { dark: isDark }
  );
}

function createHighlightStyle(colors: typeof darkColors) {
  return HighlightStyle.define([
    // JSON tokens
    { tag: tags.string, color: colors.string },
    { tag: tags.number, color: colors.number },
    { tag: tags.bool, color: colors.boolean },
    { tag: tags.null, color: colors.null },
    { tag: tags.propertyName, color: colors.property },
    { tag: tags.keyword, color: colors.keyword },
    { tag: tags.comment, color: colors.lineNumbers, fontStyle: "italic" },
    { tag: tags.bracket, color: colors.foreground },
    { tag: tags.punctuation, color: colors.lineNumbers },
    // TypeScript tokens
    { tag: tags.typeName, color: colors.number }, // string, number, boolean, null types
    { tag: tags.className, color: colors.property }, // interface/type names
    { tag: tags.definition(tags.typeName), color: colors.property }, // type being defined
    { tag: tags.definition(tags.variableName), color: colors.property },
    { tag: tags.standard(tags.typeName), color: colors.number }, // built-in types
    { tag: tags.modifier, color: colors.keyword }, // export, readonly
    { tag: tags.operator, color: colors.foreground },
  ]);
}

export const darkTheme = [
  createTheme(darkColors, true),
  syntaxHighlighting(createHighlightStyle(darkColors)),
];

export const lightTheme = [
  createTheme(lightColors, false),
  syntaxHighlighting(createHighlightStyle(lightColors)),
];
