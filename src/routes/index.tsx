import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "../components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatCOP, formatArea } from "@/lib/format";
import heroImage from "@/assets/hero-bogota.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ALQUIDEL — Inmobiliaria premium en Bogotá" },
      {
        name: "description",
        content:
          "Descubre propiedades exclusivas para venta y arriendo en Bogotá. Apartamentos, casas y oficinas seleccionadas por ALQUIDEL.",
      },
      { property: "og:image", content: heroImage },
      { name: "twitter:image", content: heroImage },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: featured } = useQuery({
    queryKey: ["properties", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, slug, type, property_type, price, area_m2, bedrooms, bathrooms, neighborhood, city, images")
        .eq("is_featured", true)
        .eq("status", "disponible")
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src={heroImage}
            alt="Edificio premium en Bogotá al atardecer"
            width={1920}
            height={1080}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/40 to-transparent" />
        </div>

        <div className="mx-auto flex min-h-[640px] max-w-7xl items-center px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl text-background">
            <Badge variant="outline" className="mb-6 border-accent/40 bg-accent/10 text-accent backdrop-blur-sm">
              <Sparkles className="mr-1.5 h-3 w-3" />
              Inmobiliaria premium · Bogotá
            </Badge>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-background sm:text-6xl">
              Encuentra tu próximo hogar en{" "}
              <span className="text-accent">Bogotá</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-background/80">
              Apartamentos, casas y oficinas seleccionadas con criterio. Venta y arriendo
              en las mejores zonas de la ciudad.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-lg">
                <Link to="/propiedades">
                  Explorar propiedades
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-lg border-background/40 bg-background/10 text-background backdrop-blur-sm hover:bg-background hover:text-foreground"
              >
                <Link to="/contacto">Contactar un asesor</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* PROPIEDADES DESTACADAS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
              Selección
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Propiedades destacadas
            </h2>
          </div>
          <Link
            to="/propiedades"
            className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex sm:items-center"
          >
            Ver todo <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured && featured.length > 0 ? (
            featured.map((p) => (
              <Card key={p.id} className="group overflow-hidden rounded-lg border-border p-0 transition-shadow hover:shadow-lg">
                <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Building2 className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-5">
                  <Badge variant="secondary" className="rounded-md uppercase tracking-wide">
                    {p.type === "venta" ? "Venta" : "Arriendo"}
                  </Badge>
                  <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {p.neighborhood ?? p.city}
                  </p>
                  <div className="flex items-baseline justify-between pt-2">
                    <span className="text-lg font-semibold text-foreground">
                      {formatCOP(Number(p.price))}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatArea(Number(p.area_m2))}</span>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Aún no hay propiedades destacadas. Pronto publicaremos nuestra selección.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CONFIANZA */}
      <section className="border-t border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            { n: "+150", l: "Propiedades publicadas" },
            { n: "12", l: "Zonas premium en Bogotá" },
            { n: "98%", l: "Clientes satisfechos" },
          ].map((s) => (
            <div key={s.l} className="text-center sm:text-left">
              <div className="text-4xl font-semibold tracking-tight text-foreground">
                {s.n}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
