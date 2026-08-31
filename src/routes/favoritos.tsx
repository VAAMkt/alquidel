import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Building2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PropertyCard } from "@/components/public/PropertyCard";
import { useFavorites } from "@/contexts/FavoritesContext";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Mis favoritos | Alquidel" },
      {
        name: "description",
        content: "Tus propiedades guardadas en Alquidel.",
      },
    ],
  }),
  component: FavoritosPage,
});

function FavoritosPage() {
  const { ids, count, removeOrphanIds } = useFavorites();

  const { data, isLoading } = useQuery({
    queryKey: ["properties", "favorites", ids.slice().sort().join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(
          "id, slug, title, type, property_type, price, area_m2, bedrooms, bathrooms, neighborhood, city, images, is_featured",
        )
        .in("id", ids);
      if (error) throw error;
      return data;
    },
  });

  // Purgar IDs huérfanos (propiedades eliminadas en DB)
  useEffect(() => {
    if (!data || ids.length === 0) return;
    const loadedIds = data.map((p) => p.id);
    const orphanIds = ids.filter((id) => !loadedIds.includes(id));
    if (orphanIds.length > 0) removeOrphanIds(orphanIds);
  }, [data, ids, removeOrphanIds]);

  return (
    <PublicLayout>
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
            Mi colección
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Mis favoritos
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {count > 0
              ? `${count} ${count === 1 ? "propiedad guardada" : "propiedades guardadas"}.`
              : "Aún no has guardado propiedades."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {count === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-base font-medium text-foreground">
              Aún no has guardado propiedades
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Marca el corazón en cualquier propiedad para guardarla aquí.
            </p>
            <Button asChild className="mt-5" variant="outline">
              <Link to="/propiedades">Ver catálogo</Link>
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[420px] animate-pulse rounded-xl border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-base font-medium text-foreground">
              Tus propiedades guardadas ya no están disponibles
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((p) => (
              <PropertyCard
                key={p.id}
                p={{
                  id: p.id,
                  slug: p.slug,
                  title: p.title,
                  type: p.type as "venta" | "arriendo",
                  price: p.price,
                  area_m2: p.area_m2,
                  bedrooms: p.bedrooms,
                  bathrooms: p.bathrooms,
                  city: p.city,
                  neighborhood: p.neighborhood,
                  images: p.images,
                  is_featured: p.is_featured,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}