import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Eye, MapPin, Sparkles, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { COMPANY } from "@/lib/company";

export const Route = createFileRoute("/nosotros")({
  head: () => ({
    meta: [
      { title: `Nosotros | ${COMPANY.name}` },
      {
        name: "description",
        content:
          "Conoce Alquidel Bienes Raíces: empresa colombiana de comercialización inmobiliaria con servicios integrales y asesoría personalizada en Bogotá y Colombia.",
      },
      { property: "og:title", content: `Nosotros | ${COMPANY.shortName}` },
      {
        property: "og:description",
        content: "Empresa colombiana dedicada a la comercialización de bienes raíces con asesoría integral.",
      },
    ],
  }),
  component: NosotrosPage,
});

function NosotrosPage() {
  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-background via-background to-secondary/40">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[400px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-background to-background"
        />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-accent" />
            Quiénes somos
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {COMPANY.tagline}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
            Somos {COMPANY.name}, una empresa colombiana enfocada en formar relaciones
            duraderas a través del mejor servicio inmobiliario.
          </p>
        </div>
      </section>

      {/* QUIÉNES SOMOS */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
          Nuestra historia
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          Quiénes somos
        </h2>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          {COMPANY.about}
        </p>
      </section>

      {/* MISIÓN Y VISIÓN */}
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:px-8">
          <Card className="rounded-2xl border-border bg-background p-8">
            <Target className="h-7 w-7 text-accent" />
            <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
              Nuestra misión
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {COMPANY.mission}
            </p>
          </Card>
          <Card className="rounded-2xl border-border bg-background p-8">
            <Eye className="h-7 w-7 text-accent" />
            <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
              Nuestra visión
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {COMPANY.vision}
            </p>
          </Card>
        </div>
      </section>

      {/* DATOS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Building2, n: "8+", l: "Propiedades exclusivas" },
            { icon: MapPin, l: "Bogotá y Colombia", n: "9", caption: "Ciudades cubiertas" },
            { icon: Users, n: "100%", l: "Asesoría personalizada" },
          ].map((s) => (
            <Card key={s.l} className="rounded-xl border-border p-6 text-center">
              <s.icon className="mx-auto h-7 w-7 text-accent" />
              <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                {s.n}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{s.l}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Encuentra tu próximo inmueble
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Explora nuestro catálogo de propiedades en venta y arriendo.
          </p>
          <Button asChild size="lg" className="mt-8 rounded-lg">
            <Link to="/propiedades">
              Ver propiedades
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
