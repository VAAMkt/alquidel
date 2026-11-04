import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { displayPrice } from "@/lib/format";
import { youtubeEmbedUrl } from "@/lib/youtube";

export function PropertyOfWeek() {
  const { data: p } = useQuery({
    queryKey: ["properties", "property-of-week"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, slug, title, type, price, city, neighborhood, images, video_url")
        .eq("is_property_of_week", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  if (!p) return null;
  const embed = youtubeEmbedUrl(p.video_url);
  const cover = p.images?.[0];

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-accent">
        <Star className="h-4 w-4" /> Propiedad de la semana
      </p>
      <div className="mt-6 grid items-center gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="aspect-video overflow-hidden rounded-xl border border-border bg-muted">
          {embed ? (
            <iframe
              src={embed}
              title={p.title}
              className="h-full w-full"
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : cover ? (
            <img src={cover} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{p.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {[p.neighborhood, p.city].filter(Boolean).join(", ")} · {p.type === "venta" ? "Venta" : "Arriendo"}
          </p>
          <p className="mt-4 text-3xl font-semibold text-primary">{displayPrice(p.price)}</p>
          <Button asChild size="lg" className="mt-6 rounded-lg">
            <Link to="/propiedades/$slug" params={{ slug: p.slug }}>
              Ver propiedad <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
