import { createFileRoute, Outlet, useRouter, useNavigate, useLocation, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "../components/layout/AdminSidebar";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  errorComponent: AdminErrorComponent,
});

function AdminLayout() {
  const { isAuthLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      navigate({
        to: "/login",
        search: { redirect: location.pathname },
        replace: true,
      });
    }
  }, [isAuthLoading, isAuthenticated, navigate, location.pathname]);

  if (isAuthLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger />
          <div className="text-sm text-muted-foreground">Panel administrativo</div>
        </header>
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AdminErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          No pudimos cargar el panel
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ocurrió un error inesperado en el área administrativa. Intenta nuevamente.
        </p>
        {import.meta.env.DEV && error?.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs text-destructive">
            {error.message}
          </pre>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
