import { describe, it, expect } from "vitest";
import {
  parseRelaxedJson,
  isStrictJson,
  isParseable,
  detectRelaxedFeatures,
  isLikelyYaml,
} from "../relaxed-json";

describe("parseRelaxedJson", () => {
  // ==========================================
  // STRICT JSON
  // ==========================================
  describe("strict JSON", () => {
    it("parses valid JSON object", () => {
      const result = parseRelaxedJson('{"name": "John", "age": 30}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: "John", age: 30 });
      expect(result.wasRelaxed).toBe(false);
    });

    it("parses valid JSON array", () => {
      const result = parseRelaxedJson("[1, 2, 3]");
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.wasRelaxed).toBe(false);
    });

    it("parses nested structures", () => {
      const result = parseRelaxedJson('{"users": [{"name": "Alice"}, {"name": "Bob"}]}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ users: [{ name: "Alice" }, { name: "Bob" }] });
      expect(result.wasRelaxed).toBe(false);
    });

    it("parses primitives", () => {
      expect(parseRelaxedJson("42").data).toBe(42);
      expect(parseRelaxedJson('"hello"').data).toBe("hello");
      expect(parseRelaxedJson("true").data).toBe(true);
      expect(parseRelaxedJson("false").data).toBe(false);
      expect(parseRelaxedJson("null").data).toBe(null);
    });

    it("handles empty input", () => {
      const result = parseRelaxedJson("");
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
      expect(result.wasRelaxed).toBe(false);
    });

    it("handles whitespace-only input", () => {
      const result = parseRelaxedJson("   \n\t  ");
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });
  });

  // ==========================================
  // JSON5 FEATURES
  // ==========================================
  describe("JSON5 features", () => {
    describe("single quotes", () => {
      it("parses single-quoted strings", () => {
        const result = parseRelaxedJson("{'name': 'John'}");
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ name: "John" });
        expect(result.wasRelaxed).toBe(true);
      });

      it("parses single quotes with escaped single quote inside", () => {
        const result = parseRelaxedJson("{'text': 'it\\'s working'}");
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ text: "it's working" });
      });
    });

    describe("trailing commas", () => {
      it("parses object with trailing comma", () => {
        const result = parseRelaxedJson('{"a": 1, "b": 2,}');
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ a: 1, b: 2 });
        expect(result.wasRelaxed).toBe(true);
      });

      it("parses array with trailing comma", () => {
        const result = parseRelaxedJson("[1, 2, 3,]");
        expect(result.success).toBe(true);
        expect(result.data).toEqual([1, 2, 3]);
        expect(result.wasRelaxed).toBe(true);
      });
    });

    describe("comments", () => {
      it("parses with single-line comments", () => {
        const result = parseRelaxedJson(`{
          // This is a comment
          "name": "John"
        }`);
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ name: "John" });
        expect(result.wasRelaxed).toBe(true);
      });

      it("parses with multi-line comments", () => {
        const result = parseRelaxedJson(`{
          /* This is a
             multi-line comment */
          "name": "John"
        }`);
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ name: "John" });
        expect(result.wasRelaxed).toBe(true);
      });

      it("preserves comments in parsing flow but produces valid JSON", () => {
        const result = parseRelaxedJson('{"a": 1, /* comment */ "b": 2}');
        expect(result.success).toBe(true);
        expect(result.normalized).toBe('{\n  "a": 1,\n  "b": 2\n}');
      });
    });

    describe("unquoted keys", () => {
      it("parses object with unquoted keys", () => {
        const result = parseRelaxedJson("{name: 'John', age: 30}");
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ name: "John", age: 30 });
        expect(result.wasRelaxed).toBe(true);
      });

      it("parses mixed quoted and unquoted keys", () => {
        const result = parseRelaxedJson('{"name": "John", age: 30}');
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ name: "John", age: 30 });
      });
    });

    describe("hex numbers", () => {
      it("parses hexadecimal numbers", () => {
        const result = parseRelaxedJson("{value: 0xFF}");
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ value: 255 });
        expect(result.wasRelaxed).toBe(true);
      });

      it("parses multiple hex numbers", () => {
        const result = parseRelaxedJson("[0x10, 0xFF, 0xABCD]");
        expect(result.success).toBe(true);
        expect(result.data).toEqual([16, 255, 43981]);
      });
    });
  });

  // ==========================================
  // SPECIAL VALUES
  // ==========================================
  describe("special values", () => {
    describe("undefined", () => {
      it("converts undefined to null", () => {
        const result = parseRelaxedJson("{value: undefined}");
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ value: null });
        expect(result.wasRelaxed).toBe(true);
      });

      it("converts undefined in arrays", () => {
        const result = parseRelaxedJson("[1, undefined, 3]");
        expect(result.success).toBe(true);
        expect(result.data).toEqual([1, null, 3]);
      });
    });

    describe("NaN and Infinity", () => {
      it("converts NaN to null", () => {
        const result = parseRelaxedJson("{value: NaN}");
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ value: null });
        expect(result.wasRelaxed).toBe(true);
      });

      it("converts Infinity to null", () => {
        const result = parseRelaxedJson("{value: Infinity}");
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ value: null });
        expect(result.wasRelaxed).toBe(true);
      });

      it("converts -Infinity to null", () => {
        const result = parseRelaxedJson("{value: -Infinity}");
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ value: null });
      });
    });
  });

  // ==========================================
  // PYTHON CONSTANTS
  // ==========================================
  describe("Python constants", () => {
    it("converts None to null", () => {
      const result = parseRelaxedJson("{value: None}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: null });
      expect(result.wasRelaxed).toBe(true);
    });

    it("converts True to true", () => {
      const result = parseRelaxedJson("{active: True}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ active: true });
      expect(result.wasRelaxed).toBe(true);
    });

    it("converts False to false", () => {
      const result = parseRelaxedJson("{active: False}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ active: false });
      expect(result.wasRelaxed).toBe(true);
    });

    it("handles Python values in arrays", () => {
      const result = parseRelaxedJson("[True, False, None]");
      expect(result.success).toBe(true);
      expect(result.data).toEqual([true, false, null]);
    });

    it("handles mixed Python and JS values", () => {
      const result = parseRelaxedJson("{a: True, b: false, c: None, d: null}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ a: true, b: false, c: null, d: null });
    });

    it("does not convert Python keywords inside strings", () => {
      const result = parseRelaxedJson('{"text": "None of this is True or False"}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ text: "None of this is True or False" });
    });
  });

  // ==========================================
  // TEMPLATE LITERALS
  // ==========================================
  describe("template literals", () => {
    it("converts simple template literal to JS marker", () => {
      const result = parseRelaxedJson("{message: `hello world`}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: "[JS: `hello world`]" });
      expect(result.wasRelaxed).toBe(true);
    });

    it("handles template literals with interpolation", () => {
      const result = parseRelaxedJson("{greeting: `Hello, ${name}!`}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ greeting: "[JS: `Hello, ${name}!`]" });
    });

    it("handles template literals with nested braces", () => {
      const result = parseRelaxedJson("{expr: `Value is ${obj.value}`}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ expr: "[JS: `Value is ${obj.value}`]" });
    });

    it("handles multiline template literals", () => {
      const result = parseRelaxedJson("{html: `<div>\n  <span>text</span>\n</div>`}");
      expect(result.success).toBe(true);
      expect((result.data as Record<string, string>).html).toContain("[JS:");
    });
  });

  // ==========================================
  // ARROW FUNCTIONS
  // ==========================================
  describe("arrow functions", () => {
    it("handles arrow function with no params", () => {
      const result = parseRelaxedJson("{fn: () => 42}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ fn: "[JS: () => 42]" });
      expect(result.wasRelaxed).toBe(true);
    });

    it("handles arrow function with single param", () => {
      const result = parseRelaxedJson("{fn: x => x * 2}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ fn: "[JS: x => x * 2]" });
    });

    it("handles arrow function with multiple params", () => {
      const result = parseRelaxedJson("{fn: (a, b) => a + b}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ fn: "[JS: (a, b) => a + b]" });
    });

    it("handles arrow function with block body", () => {
      const result = parseRelaxedJson("{fn: () => { return 42; }}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ fn: "[JS: () => { return 42; }]" });
    });

    it("handles arrow function with complex body", () => {
      const result = parseRelaxedJson("{fn: (x) => { const y = x * 2; return y; }}");
      expect(result.success).toBe(true);
      expect((result.data as Record<string, string>).fn).toContain("[JS:");
      expect((result.data as Record<string, string>).fn).toContain("const y = x * 2");
    });

    it("handles multiple arrow functions", () => {
      const result = parseRelaxedJson("{add: (a, b) => a + b, mul: (a, b) => a * b}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        add: "[JS: (a, b) => a + b]",
        mul: "[JS: (a, b) => a * b]",
      });
    });
  });

  // ==========================================
  // REGULAR FUNCTIONS
  // ==========================================
  describe("regular functions", () => {
    it("handles anonymous function", () => {
      const result = parseRelaxedJson("{fn: function() { return 42; }}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ fn: "[JS: function() { return 42; }]" });
      expect(result.wasRelaxed).toBe(true);
    });

    it("handles named function", () => {
      const result = parseRelaxedJson("{fn: function myFunc() { return 42; }}");
      expect(result.success).toBe(true);
      expect((result.data as Record<string, string>).fn).toContain("[JS: function myFunc()");
    });

    it("handles function with parameters", () => {
      const result = parseRelaxedJson("{fn: function(a, b) { return a + b; }}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ fn: "[JS: function(a, b) { return a + b; }]" });
    });

    it("handles function with complex body", () => {
      const result = parseRelaxedJson("{fn: function(x) { if (x > 0) { return x; } else { return -x; } }}");
      expect(result.success).toBe(true);
      expect((result.data as Record<string, string>).fn).toContain("[JS:");
      expect((result.data as Record<string, string>).fn).toContain("if (x > 0)");
    });
  });

  // ==========================================
  // REGEX LITERALS
  // ==========================================
  describe("regex literals", () => {
    it("handles simple regex", () => {
      const result = parseRelaxedJson("{pattern: /test/}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ pattern: "[JS: /test/]" });
      expect(result.wasRelaxed).toBe(true);
    });

    it("handles regex with flags", () => {
      const result = parseRelaxedJson("{pattern: /test/gi}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ pattern: "[JS: /test/gi]" });
    });

    it("handles regex with special characters", () => {
      const result = parseRelaxedJson("{pattern: /^[a-z]+$/i}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ pattern: "[JS: /^[a-z]+$/i]" });
    });

    it("handles regex with escaped characters", () => {
      const result = parseRelaxedJson("{pattern: /\\/path\\/to/}");
      expect(result.success).toBe(true);
      expect((result.data as Record<string, string>).pattern).toContain("[JS:");
    });

    it("handles regex with character classes", () => {
      const result = parseRelaxedJson("{pattern: /[/]/}");
      expect(result.success).toBe(true);
      // The / inside [] should not end the regex
      expect((result.data as Record<string, string>).pattern).toContain("[JS:");
    });

    it("does not confuse comments with regex", () => {
      const result = parseRelaxedJson(`{
        // this is a comment
        value: 42
      }`);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 42 });
    });
  });

  // ==========================================
  // NEW EXPRESSIONS
  // ==========================================
  describe("new expressions", () => {
    it("handles new Date()", () => {
      const result = parseRelaxedJson("{created: new Date()}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ created: "[JS: new Date()]" });
      expect(result.wasRelaxed).toBe(true);
    });

    it("handles new Date with arguments", () => {
      const result = parseRelaxedJson("{created: new Date(2024, 0, 1)}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ created: "[JS: new Date(2024, 0, 1)]" });
    });

    it("handles new RegExp", () => {
      const result = parseRelaxedJson('{pattern: new RegExp("test", "gi")}');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ pattern: '[JS: new RegExp("test", "gi")]' });
    });

    it("handles new Map()", () => {
      const result = parseRelaxedJson("{map: new Map()}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ map: "[JS: new Map()]" });
    });

    it("handles new with namespaced constructor", () => {
      const result = parseRelaxedJson("{instance: new Foo.Bar()}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ instance: "[JS: new Foo.Bar()]" });
    });

    it("handles new without parentheses", () => {
      const result = parseRelaxedJson("{obj: new Object}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ obj: "[JS: new Object]" });
    });
  });

  // ==========================================
  // BIGINT LITERALS
  // ==========================================
  describe("BigInt literals", () => {
    it("converts BigInt to number", () => {
      const result = parseRelaxedJson("{value: 123n}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 123 });
      expect(result.wasRelaxed).toBe(true);
    });

    it("handles large BigInt", () => {
      const result = parseRelaxedJson("{value: 9007199254740991n}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 9007199254740991 });
    });

    it("handles BigInt in array", () => {
      const result = parseRelaxedJson("[1n, 2n, 3n]");
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it("handles hex BigInt", () => {
      const result = parseRelaxedJson("{value: 0xFFn}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 255 });
    });
  });

  // ==========================================
  // BINARY AND OCTAL NUMBERS
  // ==========================================
  describe("binary and octal numbers", () => {
    it("converts binary numbers", () => {
      const result = parseRelaxedJson("{value: 0b1010}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 10 });
      expect(result.wasRelaxed).toBe(true);
    });

    it("converts octal numbers", () => {
      const result = parseRelaxedJson("{value: 0o755}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 493 });
      expect(result.wasRelaxed).toBe(true);
    });

    it("handles binary BigInt", () => {
      const result = parseRelaxedJson("{value: 0b1010n}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 10 });
    });

    it("handles octal BigInt", () => {
      const result = parseRelaxedJson("{value: 0o755n}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 493 });
    });

    it("handles array of binary/octal numbers", () => {
      const result = parseRelaxedJson("[0b1010, 0o755, 0xFF]");
      expect(result.success).toBe(true);
      expect(result.data).toEqual([10, 493, 255]);
    });
  });

  // ==========================================
  // LEADING/TRAILING DECIMALS
  // ==========================================
  describe("leading and trailing decimals", () => {
    it("handles leading decimal", () => {
      const result = parseRelaxedJson("{value: .5}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 0.5 });
      expect(result.wasRelaxed).toBe(true);
    });

    it("handles trailing decimal", () => {
      const result = parseRelaxedJson("{value: 5.}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 5.0 });
      expect(result.wasRelaxed).toBe(true);
    });

    it("handles array with decimal variations", () => {
      const result = parseRelaxedJson("[.5, 5., .123, 10.]");
      expect(result.success).toBe(true);
      expect(result.data).toEqual([0.5, 5.0, 0.123, 10.0]);
    });

    it("handles exponent with leading decimal", () => {
      const result = parseRelaxedJson("{value: .5e2}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 50 });
    });
  });

  // ==========================================
  // VARIABLE REFERENCES
  // ==========================================
  describe("variable references", () => {
    it("converts simple variable to string", () => {
      const result = parseRelaxedJson("{value: myVariable}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: "[JS: myVariable]" });
      expect(result.wasRelaxed).toBe(true);
    });

    it("converts dotted variable to string", () => {
      const result = parseRelaxedJson("{value: foo.bar.baz}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: "[JS: foo.bar.baz]" });
    });

    it("converts variable with method call", () => {
      const result = parseRelaxedJson("{value: foo.bar()}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: "[JS: foo.bar()]" });
    });

    it("converts variable with bracket access", () => {
      const result = parseRelaxedJson("{value: foo[bar]}");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: "[JS: foo[bar]]" });
    });

    it("preserves literals like true, false, null", () => {
      const result = parseRelaxedJson("{a: true, b: false, c: null, d: Infinity, e: NaN}");
      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).a).toBe(true);
      expect((result.data as Record<string, unknown>).b).toBe(false);
      expect((result.data as Record<string, unknown>).c).toBe(null);
    });
  });

  // ==========================================
  // YAML PARSING
  // ==========================================
  describe("YAML parsing", () => {
    it("parses simple YAML", () => {
      const result = parseRelaxedJson(`name: John
age: 30`);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: "John", age: 30 });
      expect(result.wasRelaxed).toBe(true);
      expect(result.wasYaml).toBe(true);
    });

    it("parses YAML with document marker", () => {
      const result = parseRelaxedJson(`---
name: John
age: 30`);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: "John", age: 30 });
      expect(result.wasYaml).toBe(true);
    });

    it("parses YAML arrays", () => {
      const result = parseRelaxedJson(`fruits:
  - apple
  - banana
  - cherry`);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ fruits: ["apple", "banana", "cherry"] });
      expect(result.wasYaml).toBe(true);
    });

    it("parses YAML list format", () => {
      const result = parseRelaxedJson(`- item1
- item2
- item3`);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(["item1", "item2", "item3"]);
      expect(result.wasYaml).toBe(true);
    });

    it("parses nested YAML", () => {
      const result = parseRelaxedJson(`user:
  name: John
  address:
    city: NYC
    country: USA`);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        user: {
          name: "John",
          address: {
            city: "NYC",
            country: "USA",
          },
        },
      });
    });
  });

  // ==========================================
  // COMPLEX MIXED INPUTS
  // ==========================================
  describe("complex mixed inputs", () => {
    it("handles object with multiple JS features", () => {
      const result = parseRelaxedJson(`{
        id: 0xFF,
        active: True,
        data: None,
        fn: () => {},
        pattern: /test/gi,
        created: new Date()
      }`);
      expect(result.success).toBe(true);
      const data = result.data as Record<string, unknown>;
      expect(data.id).toBe(255);
      expect(data.active).toBe(true);
      expect(data.data).toBe(null);
      expect(data.fn).toBe("[JS: () => {}]");
      expect(data.pattern).toBe("[JS: /test/gi]");
      expect(data.created).toBe("[JS: new Date()]");
    });

    it("handles deeply nested structures", () => {
      const result = parseRelaxedJson(`{
        level1: {
          level2: {
            level3: {
              value: 0b1010,
              fn: (x) => x * 2
            }
          }
        }
      }`);
      expect(result.success).toBe(true);
      const data = result.data as Record<string, Record<string, Record<string, Record<string, unknown>>>>;
      expect(data.level1.level2.level3.value).toBe(10);
      expect(data.level1.level2.level3.fn).toBe("[JS: (x) => x * 2]");
    });

    it("handles arrays with mixed types", () => {
      const result = parseRelaxedJson("[1, 'two', True, None, () => {}, /test/]");
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, "two", true, null, "[JS: () => {}]", "[JS: /test/]"]);
    });
  });

  // ==========================================
  // ERROR HANDLING
  // ==========================================
  describe("error handling", () => {
    it("returns error for invalid JSON", () => {
      const result = parseRelaxedJson("{invalid");
      expect(result.success).toBe(false);
      expect(result.error).not.toBe(null);
    });

    it("returns error with line and column info", () => {
      const result = parseRelaxedJson(`{
  "name": "John",
  "age": @invalid@
}`);
      expect(result.success).toBe(false);
      expect(result.error?.line).toBeGreaterThan(0);
      expect(result.error?.column).toBeGreaterThan(0);
    });

    it("returns error for unclosed string", () => {
      const result = parseRelaxedJson('{"name": "unclosed');
      expect(result.success).toBe(false);
      expect(result.error?.message).toBeTruthy();
    });

    it("returns error for unclosed array", () => {
      const result = parseRelaxedJson("[1, 2, 3");
      expect(result.success).toBe(false);
    });

    it("returns error for unclosed object", () => {
      const result = parseRelaxedJson('{"name": "John"');
      expect(result.success).toBe(false);
    });
  });
});

// ==========================================
// isStrictJson
// ==========================================
describe("isStrictJson", () => {
  it("returns true for valid strict JSON", () => {
    expect(isStrictJson('{"name": "John"}')).toBe(true);
    expect(isStrictJson("[1, 2, 3]")).toBe(true);
    expect(isStrictJson("42")).toBe(true);
    expect(isStrictJson('"hello"')).toBe(true);
    expect(isStrictJson("true")).toBe(true);
    expect(isStrictJson("null")).toBe(true);
  });

  it("returns false for relaxed JSON", () => {
    expect(isStrictJson("{name: 'John'}")).toBe(false);
    expect(isStrictJson("[1, 2, 3,]")).toBe(false);
    expect(isStrictJson("{value: 0xFF}")).toBe(false);
    expect(isStrictJson("// comment\n{}")).toBe(false);
  });

  it("returns false for invalid input", () => {
    expect(isStrictJson("{invalid")).toBe(false);
    expect(isStrictJson("")).toBe(false);
  });
});

// ==========================================
// isParseable
// ==========================================
describe("isParseable", () => {
  it("returns true for strict JSON", () => {
    expect(isParseable('{"name": "John"}')).toBe(true);
  });

  it("returns true for relaxed JSON", () => {
    expect(isParseable("{name: 'John'}")).toBe(true);
    expect(isParseable("{value: 0xFF}")).toBe(true);
    expect(isParseable("{active: True}")).toBe(true);
  });

  it("returns true for YAML", () => {
    expect(isParseable("name: John\nage: 30")).toBe(true);
  });

  it("returns false for invalid input", () => {
    expect(isParseable("{invalid")).toBe(false);
  });
});

// ==========================================
// detectRelaxedFeatures
// ==========================================
describe("detectRelaxedFeatures", () => {
  it("detects single quotes", () => {
    const features = detectRelaxedFeatures("{'name': 'John'}");
    expect(features).toContain("single quotes");
  });

  it("detects trailing commas", () => {
    const features = detectRelaxedFeatures('{"a": 1,}');
    expect(features).toContain("trailing commas");
  });

  it("detects comments", () => {
    const features = detectRelaxedFeatures("{ // comment\n}");
    expect(features).toContain("comments");
  });

  it("detects unquoted keys", () => {
    const features = detectRelaxedFeatures("{name: 'John'}");
    expect(features).toContain("unquoted keys");
  });

  it("detects undefined values", () => {
    const features = detectRelaxedFeatures("{value: undefined}");
    expect(features).toContain("undefined values");
  });

  it("detects special numbers", () => {
    const features = detectRelaxedFeatures("{value: NaN}");
    expect(features).toContain("special numbers");
  });

  it("detects hex numbers", () => {
    const features = detectRelaxedFeatures("{value: 0xFF}");
    expect(features).toContain("hex numbers");
  });

  it("detects template literals", () => {
    const features = detectRelaxedFeatures("{message: `hello`}");
    expect(features).toContain("template literals");
  });

  it("detects Python None", () => {
    const features = detectRelaxedFeatures("{value: None}");
    expect(features).toContain("Python None");
  });

  it("detects Python booleans", () => {
    const features = detectRelaxedFeatures("{active: True}");
    expect(features).toContain("Python booleans");
  });

  it("detects arrow functions", () => {
    const features = detectRelaxedFeatures("{fn: () => {}}");
    expect(features).toContain("arrow functions");
  });

  it("detects regular functions", () => {
    const features = detectRelaxedFeatures("{fn: function() {}}");
    expect(features).toContain("functions");
  });

  it("detects regex literals", () => {
    const features = detectRelaxedFeatures("{pattern: /test/gi}");
    expect(features).toContain("regex literals");
  });

  it("detects new expressions", () => {
    const features = detectRelaxedFeatures("{date: new Date()}");
    expect(features).toContain("new expressions");
  });

  it("detects BigInt", () => {
    const features = detectRelaxedFeatures("{value: 123n}");
    expect(features).toContain("BigInt");
  });

  it("detects binary numbers", () => {
    const features = detectRelaxedFeatures("{value: 0b1010}");
    expect(features).toContain("binary numbers");
  });

  it("detects octal numbers", () => {
    const features = detectRelaxedFeatures("{value: 0o755}");
    expect(features).toContain("octal numbers");
  });

  it("detects YAML format", () => {
    const features = detectRelaxedFeatures("name: John\nage: 30");
    expect(features).toContain("YAML format");
  });

  it("returns empty array for strict JSON", () => {
    const features = detectRelaxedFeatures('{"name": "John"}');
    expect(features).toHaveLength(0);
  });
});

// ==========================================
// isLikelyYaml
// ==========================================
describe("isLikelyYaml", () => {
  it("returns true for YAML with document marker", () => {
    expect(isLikelyYaml("---\nname: John")).toBe(true);
  });

  it("returns true for YAML key-value format", () => {
    expect(isLikelyYaml("name: John\nage: 30")).toBe(true);
  });

  it("returns true for YAML list", () => {
    expect(isLikelyYaml("- item1\n- item2")).toBe(true);
  });

  it("returns true for YAML multi-line strings", () => {
    expect(isLikelyYaml("content: |\n  line1\n  line2")).toBe(true);
  });

  it("returns false for JSON starting with {", () => {
    expect(isLikelyYaml('{"name": "John"}')).toBe(false);
  });

  it("returns false for JSON starting with [", () => {
    expect(isLikelyYaml("[1, 2, 3]")).toBe(false);
  });

  it("returns false for JSON5 with unquoted keys", () => {
    expect(isLikelyYaml("{name: 'John'}")).toBe(false);
  });
});
