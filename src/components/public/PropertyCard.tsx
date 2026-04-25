import { Link } from "@tanstack/react-router";
import { Bath, Bed, GitCompare, Heart, MapPin, Maximize, Sparkles, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { displayPrice, formatArea } from "@/lib/format";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCompare } from "@/contexts/CompareContext";
import { cn } from "@/lib/utils";
import { PropertyImagePlaceholder } from "./PropertyImagePlaceholder";

export interface PropertyCardData {
  id: string;
  slug: string;
  title: string;
  type: "venta" | "arriendo";
  price: number | string;
  area_m2: number | string;
  bedrooms: number;
  bathrooms: number;
  city: string;
  neighborhood: string | null;
  images: string[] | null;
  is_featured?: boolean;
  created_at?: string;
}

export function PropertyCard({ p }: { p: PropertyCardData }) {
  const cover = p.images?.[0];
  const { isFavorite, toggle: toggleFav } = useFavorites();
  const { isInCompare, toggle: toggleCmp } = useCompare();
  const fav = isFavorite(p.id);
  const cmp = isInCompare(p.id);
  const altText = `${p.title} en ${p.city}`;

  const showStaleBadge = (() => {
    if (!p.created_at) return false;
    const created = new Date(p.created_at).getTime();
    if (!Number.isFinite(created)) return false;
    return Date.now() - created > 30 * 24 * 60 * 60 * 1000;
  })();

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <Link
      to="/propiedades/$slug"
      params={{ slug: p.slug }}
      className="group block"
      aria-label={`Ver propiedad: ${p.title}`}
    >
      <Card className="overflow-hidden rounded-xl border-border p-0 transition-all hover:-translate-y-0.5 hover:shadow-xl">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {cover ? (
            <img
              src={cover}
              alt={altText}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <PropertyImagePlaceholder />
          )}
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-3rem)] flex-wrap gap-2">
            <Badge
              className={
                p.type === "venta"
                  ? "rounded-md bg-slate-800 text-slate-50 hover:bg-slate-800"
                  : "rounded-md bg-amber-500 text-white hover:bg-amber-500"
              }
            >
              {p.type === "venta" ? "Venta" : "Arriendo"}
            </Badge>
            {p.is_featured && (
              <Badge className="rounded-md border border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100">
                <Sparkles className="mr-1 h-3 w-3" /> Destacada
              </Badge>
            )}
            {showStaleBadge && (
              <Badge className="rounded-md bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50">
                <TrendingDown className="mr-1 h-3 w-3" />
                Nuevo precio
              </Badge>
            )}
          </div>
          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => { stop(e); toggleFav(p.id); }}
              aria-label={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
              aria-pressed={fav}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm transition-colors hover:bg-background",
                "active:[animation:heart-pop_220ms_ease-out]",
                fav ? "text-rose-500" : "text-foreground",
              )}
            >
              <Heart className={cn("h-4 w-4", fav && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={(e) => { stop(e); toggleCmp(p); }}
              aria-label={cmp ? "Quitar de comparación" : "Agregar a comparación"}
              aria-pressed={cmp}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm transition-colors hover:bg-background",
                cmp ? "text-slate-900" : "text-foreground",
              )}
            >
              <GitCompare className={cn("h-4 w-4", cmp && "fill-current")} />
            </button>
          </div>
        </div>
        <div className="space-y-3 p-5">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {displayPrice(p.price)}
            </p>
            <h3 className="mt-1 line-clamp-1 text-base font-medium text-foreground">
              {p.title}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">
                {p.neighborhood ? `${p.neighborhood}, ${p.city}` : p.city}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Maximize className="h-3.5 w-3.5" />
              {formatArea(Number(p.area_m2))}
            </span>
            <span className="inline-flex items-center gap-1">
              <Bed className="h-3.5 w-3.5" />
              {p.bedrooms}
            </span>
            <span className="inline-flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" />
              {p.bathrooms}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
