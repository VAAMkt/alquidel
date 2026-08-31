import { Link } from "@tanstack/react-router";
import { Building2, GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompare } from "@/contexts/CompareContext";

export function CompareBar() {
  const { items, remove, clear, count } = useCompare();

  if (count < 2) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {items.map((p) => (
            <div
              key={p.id}
              className="group relative h-12 w-12 overflow-hidden rounded-md border border-border bg-muted sm:h-14 sm:w-14"
              title={p.title}
            >
              {p.images?.[0] ? (
                <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Building2 className="h-5 w-5" />
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="absolute right-0 top-0 inline-flex h-4 w-4 items-center justify-center rounded-bl-md bg-background/90 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Quitar de comparación"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <p className="ml-2 hidden text-sm text-muted-foreground sm:block">
            {count} {count === 1 ? "propiedad" : "propiedades"} en comparación
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clear}>
            Limpiar
          </Button>
          <Button asChild size="sm" className="bg-slate-800 hover:bg-slate-900">
            <Link to="/comparar">
              <GitCompare className="mr-1.5 h-4 w-4" />
              Comparar ({count})
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
