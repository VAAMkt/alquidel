import { createFileRoute, Link } from "@tanstack/react-router";
import { Bath, Bed, Building2, Eye, GitCompare, Maximize, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useCompare } from "@/contexts/CompareContext";
import { displayPrice, formatArea } from "@/lib/format";

export const Route = createFileRoute("/comparar")({
  head: () => ({
    meta: [
      { title: "Comparador de propiedades | Alquidel" },
      {
        name: "description",
        content:
          "Compara hasta 3 propiedades lado a lado: precio, área, habitaciones, baños y amenidades.",
      },
      { property: "og:title", content: "Comparador de propiedades | Alquidel" },
      { property: "og:description", content: "Compara hasta 3 propiedades lado a lado." },
      { property: "og:url", content: "https://alquidel.com/comparar" },
    ],
    links: [{ rel: "canonical", href: "https://alquidel.com/comparar" }],
  }),
  component: CompararPage,
});

function CompararPage() {
  const { items, remove, clear, count } = useCompare();

  return (
    <PublicLayout>
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
            Comparador
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Comparar propiedades
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Hasta 3 propiedades lado a lado para decidir mejor.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {count < 2 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
            <GitCompare className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-base font-medium text-foreground">
              Selecciona al menos 2 propiedades para comparar
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Marca las propiedades que te interesan desde el catálogo.
            </p>
            <Button asChild className="mt-5" variant="outline">
              <Link to="/propiedades">Ir al catálogo</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Comparando {count} {count === 1 ? "propiedad" : "propiedades"}
              </p>
              <Button variant="ghost" size="sm" onClick={clear}>
                Limpiar comparación
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="w-32 bg-muted/50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Propiedad
                    </th>
                    {items.map((p) => (
                      <th
                        key={p.id}
                        className="border-b border-border px-3 py-3 align-top"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-muted">
                          {p.images?.[0] ? (
                            <img
                              src={p.images[0]}
                              alt={p.title}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <Building2 className="h-10 w-10" />
                            </div>
                          )}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">
                          {p.title}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                            <Link to="/propiedades/$slug" params={{ slug: p.slug }}>
                              <Eye className="mr-1 h-3 w-3" /> Ver
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => remove(p.id)}
                          >
                            <X className="mr-1 h-3 w-3" /> Quitar
                          </Button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Row label="Precio">
                    {items.map((p) => (
                      <td key={p.id} className="border-b border-border px-3 py-3 align-top text-sm font-semibold text-foreground">
                        {displayPrice(p.price)}
                      </td>
                    ))}
                  </Row>
                  <Row label="Operación">
                    {items.map((p) => (
                      <td key={p.id} className="border-b border-border px-3 py-3 align-top">
                        <Badge
                          className={
                            p.type === "venta"
                              ? "rounded-md bg-slate-800 text-slate-50 hover:bg-slate-800"
                              : "rounded-md bg-[color:var(--brand-teal)] text-white hover:bg-[color:var(--brand-teal)]"
                          }
                        >
                          {p.type === "venta" ? "Venta" : "Arriendo"}
                        </Badge>
                      </td>
                    ))}
                  </Row>
                  <Row label="Área">
                    {items.map((p) => (
                      <td key={p.id} className="border-b border-border px-3 py-3 align-top text-sm text-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Maximize className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatArea(Number(p.area_m2))}
                        </span>
                      </td>
                    ))}
                  </Row>
                  <Row label="Habitaciones">
                    {items.map((p) => (
                      <td key={p.id} className="border-b border-border px-3 py-3 align-top text-sm text-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Bed className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.bedrooms}
                        </span>
                      </td>
                    ))}
                  </Row>
                  <Row label="Baños">
                    {items.map((p) => (
                      <td key={p.id} className="border-b border-border px-3 py-3 align-top text-sm text-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Bath className="h-3.5 w-3.5 text-muted-foreground" />
                          {p.bathrooms}
                        </span>
                      </td>
                    ))}
                  </Row>
                  <Row label="Ubicación">
                    {items.map((p) => (
                      <td key={p.id} className="border-b border-border px-3 py-3 align-top text-sm text-foreground">
                        {p.neighborhood ? `${p.neighborhood}, ${p.city}` : p.city}
                      </td>
                    ))}
                  </Row>
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </PublicLayout>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <th className="border-b border-border bg-muted/30 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </th>
      {children}
    </tr>
  );
}