// Site configuration for SEO and metadata
// Update SITE_URL when you deploy to production

export const siteConfig = {
  name: "json't",
  title: "json't — JSON Tools for Developers",
  description:
    "Privacy-first JSON tools. Format, validate, transform, query with JSONPath, and generate schemas. 100% browser-based — your data never leaves your machine.",
  // Update this to your actual domain when deployed
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://jsont.dev",
  ogImage: "/og-image.png",
  creator: "@jsont_dev",
  keywords: [
    "JSON",
    "JSON formatter",
    "JSON validator",
    "JSON beautifier",
    "JSON minifier",
    "JSON schema generator",
    "JSONPath",
    "JSON query",
    "JSON to TypeScript",
    "JSON to Zod",
    "JSON to YAML",
    "JSON tools",
    "JSON toolkit",
    "developer tools",
    "web developer tools",
    "privacy-first",
    "browser-based",
    "offline JSON tools",
    "free JSON formatter",
    "online JSON editor",
  ],
  features: [
    "Format & beautify JSON",
    "Validate JSON syntax",
    "Minify JSON",
    "Query with JSONPath",
    "Generate JSON Schema",
    "Convert to TypeScript types",
    "Generate Zod schemas",
    "Convert JSON to YAML",
    "Privacy-first: runs 100% in browser",
    "No data sent to servers",
    "Works offline",
    "Dark mode support",
  ],
};
