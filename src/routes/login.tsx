import { createFileRoute, useNavigate, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => {
    const r = typeof search.redirect === "string" ? search.redirect : undefined;
    // Solo aceptar paths internos (no URLs absolutas) para evitar open-redirects
    const safe = r && r.startsWith("/") && !r.startsWith("//") ? r : undefined;
    return safe ? { redirect: safe } : {};
  },
  beforeLoad: async ({ search }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      throw redirect({ to: search.redirect ?? "/admin/dashboard" });
    }
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

  // Respaldo: si por alguna razón el submit no navega, el listener lo hace
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({
          to: search.redirect ?? "/admin/dashboard",
          replace: true,
        });
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // Navegar de inmediato (no esperar al listener)
      const target = search.redirect ?? "/admin/dashboard";
      navigate({ to: target, replace: true });
    } catch (err) {
      console.error("[login] submit error", err);
      toast.error("Ocurrió un error al iniciar sesión");
    } finally {
      setLoading(false);
    }
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
            <Input id="email" name="email" type="email" required className="mt-1.5" autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" required className="mt-1.5" autoComplete="current-password" />
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