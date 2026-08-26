import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { PublicNavbar } from "./PublicNavbar";
import { PublicFooter } from "./PublicFooter";
import { ChatWidget } from "@/components/public/ChatWidget";
import { CompareBar } from "@/components/public/CompareBar";
import { flushPageView, startPageView } from "@/lib/page-views";

function usePageViewTracking() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    startPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    const onHide = () => flushPageView(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
    };
  }, []);
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  usePageViewTracking();

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
