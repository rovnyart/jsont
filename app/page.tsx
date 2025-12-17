import { Header } from "@/components/layout/header";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 md:px-6">
          {/* Editor area placeholder */}
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8">
            <div className="flex flex-col items-center justify-center gap-4 text-center min-h-[60vh]">
              <div className="rounded-full bg-muted p-4">
                <svg
                  className="h-8 w-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Paste your JSON here</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Or drop a file to get started
                </p>
              </div>
              <p className="text-xs text-muted-foreground max-w-md">
                Supports valid JSON, JS-style objects (single quotes, trailing
                commas, comments), and more.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
