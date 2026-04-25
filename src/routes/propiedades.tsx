import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin } from "lucide-react";
import { PublicLayout } from "../components/layout/PublicLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatCOP, formatArea } from "@/lib/format";

export const Route = createFileRoute("/propiedades")({
  head: () => ({
    meta: [
      { title: "Propiedades · ALQUIDEL" },
      { name: "description", content: "Catálogo de propiedades en venta y arriendo en Bogotá." },
      { property: "og:title", content: "Propiedades · ALQUIDEL" },
      { property: "og:description", content: "Catálogo de propiedades en venta y arriendo en Bogotá." },
    ],
  }),
  component: PropiedadesPage,
});

function PropiedadesPage() {
  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("status", "disponible")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
          Catálogo
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
          Propiedades disponibles
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Una selección curada de inmuebles para venta y arriendo en Bogotá.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && (
            <div className="col-span-full text-sm text-muted-foreground">Cargando…</div>
          )}
          {!isLoading && properties && properties.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Aún no hay propiedades publicadas.{" "}
                <Link to="/contacto" className="text-foreground underline">
                  Contáctanos
                </Link>{" "}
                para una búsqueda personalizada.
              </p>
            </div>
          )}
          {properties?.map((p) => (
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
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-md uppercase tracking-wide">
                    {p.type === "venta" ? "Venta" : "Arriendo"}
                  </Badge>
                  <Badge variant="outline" className="rounded-md capitalize">
                    {p.property_type}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {p.neighborhood ?? p.city}
                </p>
                <div className="flex items-baseline justify-between pt-2">
                  <span className="text-lg font-semibold text-foreground">
                    {formatCOP(Number(p.price))}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatArea(Number(p.area_m2))} · {p.bedrooms} hab · {p.bathrooms} baños
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}