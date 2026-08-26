import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Operacion } from "@/lib/landings";

export const LANDING_LIMIT = 12;

export function cityLandingQueryOptions(city: string, operacion: Operacion) {
  return queryOptions({
    queryKey: ["landing", "city", city, operacion],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from("properties")
        .select(
          "id, slug, title, type, property_type, price, area_m2, bedrooms, bathrooms, neighborhood, city, images, is_featured, created_at",
          { count: "exact" },
        )
        .eq("status", "disponible")
        .eq("city", city)
        .eq("type", operacion)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(LANDING_LIMIT);

      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });
}
