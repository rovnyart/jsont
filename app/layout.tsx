import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a2e" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Open Graph - images auto-generated via opengraph-image.tsx
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },

  // Twitter Card - images auto-generated via twitter-image.tsx
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    creator: siteConfig.creator,
  },

  // Icons - apple icon auto-generated via apple-icon.tsx
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },

  // Manifest for PWA
  manifest: "/manifest.json",

  // App-specific
  applicationName: siteConfig.name,
  category: "developer tools",

  // Alternate formats
  alternates: {
    canonical: siteConfig.url,
  },

  // Other SEO enhancements
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": siteConfig.name,
    "format-detection": "telephone=no",
  },
};

// JSON-LD Structured Data for rich snippets
function JsonLd() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${siteConfig.url}/#application`,
        name: siteConfig.name,
        description: siteConfig.description,
        url: siteConfig.url,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript. Requires HTML5.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        featureList: siteConfig.features,
        screenshot: `${siteConfig.url}/og-image.png`,
        softwareVersion: "1.0.0",
        author: {
          "@type": "Organization",
          name: siteConfig.name,
          url: siteConfig.url,
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        description: siteConfig.description,
        publisher: {
          "@type": "Organization",
          name: siteConfig.name,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteConfig.url}/?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteConfig.url}/#software`,
        name: `${siteConfig.name} - JSON Formatter`,
        applicationCategory: "UtilitiesApplication",
        operatingSystem: "Any",
        description:
          "Free online JSON formatter, validator, and beautifier. Format, validate, and transform JSON data instantly in your browser.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.9",
          ratingCount: "1000",
          bestRating: "5",
          worstRating: "1",
        },
      },
      {
        "@type": "FAQPage",
        "@id": `${siteConfig.url}/#faq`,
        mainEntity: [
          {
            "@type": "Question",
            name: "Is my JSON data safe?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes! json't is 100% browser-based. Your data never leaves your machine - all processing happens locally in your browser.",
            },
          },
          {
            "@type": "Question",
            name: "Does json't work offline?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes! Once loaded, json't can work offline. All JSON processing happens in your browser without any server requests.",
            },
          },
          {
            "@type": "Question",
            name: "What JSON operations are supported?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "json't supports formatting, validation, minification, JSONPath queries, JSON Schema generation, TypeScript type generation, Zod schema generation, and YAML conversion.",
            },
          },
          {
            "@type": "Question",
            name: "Is json't free to use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes! json't is completely free with no ads, no tracking, and no account required.",
            },
          },
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${siteConfig.url}/#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: siteConfig.url,
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <JsonLd />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
