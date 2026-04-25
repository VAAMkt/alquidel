import { Link } from "@tanstack/react-router";
import { Bath, Bed, Building2, GitCompare, Heart, MapPin, Maximize } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCOP, formatArea } from "@/lib/format";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCompare } from "@/contexts/CompareContext";
import { cn } from "@/lib/utils";

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
}

export function PropertyCard({ p }: { p: PropertyCardData }) {
  const cover = p.images?.[0];
  const { isFavorite, toggle: toggleFav } = useFavorites();
  const { isInCompare, toggle: toggleCmp } = useCompare();
  const fav = isFavorite(p.id);
  const cmp = isInCompare(p.id);

  function stop(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <Link
      to="/propiedades/$slug"
      params={{ slug: p.slug }}
      className="group block"
    >
      <Card className="overflow-hidden rounded-xl border-border p-0 transition-all hover:-translate-y-0.5 hover:shadow-xl">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {cover ? (
            <img
              src={cover}
              alt={p.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Building2 className="h-12 w-12" />
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-2">
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
              <Badge variant="secondary" className="rounded-md bg-background/90 text-foreground backdrop-blur-sm">
                Destacada
              </Badge>
            )}
          </div>
          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => { stop(e); toggleFav(p.id); }}
              aria-label={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/90 backdrop-blur-sm transition-colors hover:bg-background",
                fav ? "text-rose-500" : "text-foreground",
              )}
            >
              <Heart className={cn("h-4 w-4", fav && "fill-current")} />
            </button>
            <button
              type="button"
              onClick={(e) => { stop(e); toggleCmp(p); }}
              aria-label={cmp ? "Quitar de comparación" : "Agregar a comparación"}
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
              {formatCOP(Number(p.price))}
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
