import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => {
    const r = typeof search.redirect === "string" ? search.redirect : undefined;
    // Solo aceptar paths internos a /admin para evitar open-redirects y loops
    const safe = r && r.startsWith("/admin") && !r.startsWith("//") ? r : undefined;
    return safe ? { redirect: safe } : {};
  },
  head: () => ({
    meta: [
      { title: "Acceso de agentes · ALQUIDEL" },
      { name: "description", content: "Acceso para agentes inmobiliarios de ALQUIDEL." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { isAuthLoading, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  // Limpiar email/password de la URL si llegaron por un submit GET accidental
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has("email") || url.searchParams.has("password")) {
      url.searchParams.delete("email");
      url.searchParams.delete("password");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Una sola fuente de verdad: cuando el contexto detecte sesión, redirigir.
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      navigate({
        to: search.redirect ?? "/admin/dashboard",
        replace: true,
      });
    }
  }, [isAuthLoading, isAuthenticated, navigate, search.redirect]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const fd = new FormData(e.currentTarget);
      const parsed = schema.safeParse({
        email: fd.get("email"),
        password: fd.get("password"),
      });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
        return;
      }
      setLoading(true);
      const { data: signInData, error } = await supabase.auth.signInWithPassword(parsed.data);
      if (error) {
        const msg = error.message?.toLowerCase() ?? "";
        if (msg.includes("invalid login")) {
          toast.error("Email o contraseña incorrectos");
        } else if (msg.includes("email not confirmed")) {
          toast.error("Verifica tu correo antes de ingresar");
        } else {
          toast.error(error.message || "No se pudo iniciar sesión");
        }
        return;
      }
      if (!signInData.session) {
        toast.error("No se pudo crear la sesión. Intenta de nuevo.");
        return;
      }
      toast.success("Bienvenido");
      // No navegar aquí: el AuthProvider emitirá SIGNED_IN, isAuthenticated
      // pasará a true y el useEffect de arriba redirigirá una sola vez.
    } catch {
      toast.error("Ocurrió un error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  // Mientras el contexto resuelve la sesión inicial, no mostrar el formulario
  // para evitar el flash en refresh con sesión activa.
  if (isAuthLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-background p-8 shadow-sm">
        <Link to="/" className="mb-8 inline-flex items-baseline gap-1">
          <span className="text-lg font-semibold tracking-[0.2em] text-foreground">
            ALQUIDEL
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Acceso de agentes
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ingresa con tu cuenta corporativa para gestionar propiedades y leads.
        </p>

        <form
          onSubmit={onSubmit}
          method="post"
          action="#"
          noValidate
          className="mt-8 space-y-5"
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              aria-required="true"
              className="mt-1.5"
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              aria-required="true"
              className="mt-1.5"
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-lg" size="lg">
            {loading ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿Eres cliente?{" "}
          <Link to="/" className="text-foreground hover:underline">
            Vuelve al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}