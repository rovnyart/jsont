import { Header } from "@/components/layout/header";
import { JsonWorkspace } from "@/components/json-workspace";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 p-4 md:p-6">
        <JsonWorkspace />
      </main>
    </div>
  );
}
