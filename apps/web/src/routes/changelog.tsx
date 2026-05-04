import { createFileRoute } from "@tanstack/react-router";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ChangelogFileViewer from "@/components/ui/file-viewer-demo";

export const Route = createFileRoute("/changelog")({
  component: Changelog,
});

function Changelog() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <ChangelogFileViewer />
      </main>
      <Footer />
    </div>
  );
}
