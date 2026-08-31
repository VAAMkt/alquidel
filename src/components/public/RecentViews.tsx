import { useQuery } from "@tanstack/react-query";
import { useRecentViews } from "@/hooks/useRecentViews";
import { PropertyCard } from "./PropertyCard";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sección "Viste recientemente" en Home.
 * Lee slugs de localStorage y carga los datos. Filtra los que ya no existen.
 */
export function RecentViews() {
  const { slugs, hydrated } = useRecentViews();

  const { data } = useQuery({
    queryKey: ["properties", "recent-views", slugs.join(",")],
    queryFn: async () => {
      if (slugs.length === 0) return [];
      const { data, error } = await supabase
        .from("properties")
        .select(
          "id, slug, title, type, price, area_m2, bedrooms, bathrooms, neighborhood, city, images, is_featured, created_at",
        )
        .in("slug", slugs);
      if (error) throw error;
      // Mantener orden según el array original
      return (data ?? []).sort(
        (a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug),
      );
    },
    enabled: hydrated && slugs.length > 0,
  });

  if (!hydrated || !data || data.length === 0) return null;

  return (
    <div className="mt-16 border-t border-border pt-12">
      <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
        Tu historial
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Viste recientemente
      </h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
              created_at: (p as any).created_at,
            }}
          />
        ))}
      </div>
    </div>
  );
}
