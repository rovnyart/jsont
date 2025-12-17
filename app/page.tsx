import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { JsonWorkspace } from "@/components/json-workspace";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 p-4 pb-2 md:p-6 md:pb-3">
        <JsonWorkspace />
      </main>
      <Footer />
    </div>
  );
}
