import { createFileRoute, Outlet, redirect, useRouter, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "../components/layout/AdminSidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        throw redirect({
          to: "/login",
          search: { redirect: location.href },
        });
      }
    } catch (err) {
      // Re-lanzar redirects de TanStack Router intactos
      if (err && typeof err === "object" && "isRedirect" in (err as any)) throw err;
      // En caso de fallo inesperado al consultar la sesión, redirigir a login
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AdminLayout,
  errorComponent: AdminErrorComponent,
});

function AdminLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    // Render mínimo mientras el redirect de beforeLoad se aplica
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
