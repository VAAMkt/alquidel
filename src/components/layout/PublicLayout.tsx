import { PublicNavbar } from "./PublicNavbar";
import { PublicFooter } from "./PublicFooter";
import { ChatWidget } from "@/components/public/ChatWidget";
import { CompareBar } from "@/components/public/CompareBar";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
      <CompareBar />
      <ChatWidget />
    </div>
  );
}