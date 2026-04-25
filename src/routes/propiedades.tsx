import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PropertyCard } from "@/components/public/PropertyCard";
import { PropertyCardSkeleton } from "@/components/public/PropertyCardSkeleton";
import { AlertsModal } from "@/components/public/AlertsModal";
import { ClientOnly } from "@/components/common/ClientOnly";
import { supabase } from "@/integrations/supabase/client";
import { formatCOP } from "@/lib/format";

const PROPERTY_TYPES = [
  "apartamento",
  "casa",
  "local",
  "oficina",
  "lote",
  "bodega",
] as const;

const CITIES = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Bucaramanga",
  "Pereira",
  "Manizales",
] as const;

const PRICE_MAX_DEFAULT = 5_000_000_000;
const PER_PAGE = 12;

const searchSchema = z.object({
  operacion: fallback(z.enum(["todos", "venta", "arriendo"]), "todos").default("todos"),
  tipos: fallback(
    z.array(z.enum(PROPERTY_TYPES)),
    [],
  ).default([]),
  ciudad: fallback(z.string(), "todas").default("todas"),
  precioMax: fallback(z.number().int().min(100_000_000).max(PRICE_MAX_DEFAULT), PRICE_MAX_DEFAULT).default(PRICE_MAX_DEFAULT),
  habMin: fallback(z.number().int().min(0).max(4), 0).default(0),
  sort: fallback(
    z.enum(["recientes", "precio-asc", "precio-desc", "destacados"]),
    "recientes",
  ).default("recientes"),
  page: fallback(z.number().int().min(1), 1).default(1),
});

const DEFAULTS = {
  operacion: "todos" as const,
  tipos: [] as Array<(typeof PROPERTY_TYPES)[number]>,
  ciudad: "todas",
  precioMax: PRICE_MAX_DEFAULT,
  habMin: 0,
  sort: "recientes" as const,
  page: 1,
};

export const Route = createFileRoute("/propiedades")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Propiedades en venta y arriendo | Alquidel Bienes Raíces" },
      {
        name: "description",
        content:
          "Catálogo de inmuebles para venta y arriendo en Bogotá y principales ciudades de Colombia. Apartamentos, casas, oficinas, locales y más.",
      },
      { property: "og:title", content: "Propiedades | Alquidel" },
      {
        property: "og:description",
        content: "Inmuebles seleccionados para venta y arriendo en Colombia.",
      },
    ],
  }),
  component: PropiedadesPage,
});

function PropiedadesPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/propiedades" });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "properties",
      "public",
      search.operacion,
      [...search.tipos].sort().join(","),
      search.ciudad,
      search.precioMax,
      search.habMin,
      search.sort,
      search.page,
    ],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const from = (search.page - 1) * PER_PAGE;
      const to = from + PER_PAGE - 1;

      let q = supabase
        .from("properties")
        .select(
          "id, slug, title, type, property_type, price, area_m2, bedrooms, bathrooms, neighborhood, city, images, is_featured, created_at",
          { count: "exact" },
        )
        .eq("status", "disponible");

      if (search.operacion !== "todos") q = q.eq("type", search.operacion);
      if (search.tipos.length > 0) q = q.in("property_type", search.tipos);
      if (search.ciudad !== "todas") q = q.eq("city", search.ciudad);
      if (search.precioMax < PRICE_MAX_DEFAULT) q = q.lte("price", search.precioMax);
      if (search.habMin > 0) q = q.gte("bedrooms", search.habMin);

      switch (search.sort) {
        case "precio-asc":
          q = q.order("price", { ascending: true });
          break;
        case "precio-desc":
          q = q.order("price", { ascending: false });
          break;
        case "destacados":
          q = q
            .order("is_featured", { ascending: false })
            .order("created_at", { ascending: false });
          break;
        default:
          q = q.order("created_at", { ascending: false });
      }

      const { data, count, error } = await q.range(from, to);
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(search.page, totalPages);
  const pageItems = data?.rows ?? [];

  function setSearch(patch: Partial<typeof DEFAULTS>) {
    navigate({
      search: (prev: any) => ({
        ...prev,
        ...patch,
        page: patch.page ?? 1,
      }),
    });
  }

  function clearAll() {
    navigate({ search: DEFAULTS });
    setFiltersOpen(false);
  }

  function toggleTipo(tipo: (typeof PROPERTY_TYPES)[number]) {
    const current = search.tipos;
    const next = current.includes(tipo)
      ? current.filter((t: (typeof PROPERTY_TYPES)[number]) => t !== tipo)
      : [...current, tipo];
    setSearch({ tipos: next });
  }

  const activeFilterCount =
    (search.operacion !== "todos" ? 1 : 0) +
    search.tipos.length +
    (search.ciudad !== "todas" ? 1 : 0) +
    (search.precioMax !== PRICE_MAX_DEFAULT ? 1 : 0) +
    (search.habMin !== 0 ? 1 : 0);

  const FiltersPanel = (
    <div className="space-y-7">
      {/* Operación */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Operación
        </Label>
        <RadioGroup
          value={search.operacion}
          onValueChange={(v) => setSearch({ operacion: v as typeof DEFAULTS.operacion })}
          className="mt-3 space-y-2"
        >
          {[
            { v: "todos", l: "Todas" },
            { v: "venta", l: "Venta" },
            { v: "arriendo", l: "Arriendo" },
          ].map((opt) => (
            <div key={opt.v} className="flex items-center gap-2">
              <RadioGroupItem value={opt.v} id={`op-${opt.v}`} />
              <Label htmlFor={`op-${opt.v}`} className="cursor-pointer text-sm font-normal">
                {opt.l}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Tipo de inmueble */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tipo de inmueble
        </Label>
        <div className="mt-3 space-y-2">
          {PROPERTY_TYPES.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <Checkbox
                id={`tipo-${t}`}
                checked={search.tipos.includes(t)}
                onCheckedChange={() => toggleTipo(t)}
              />
              <Label htmlFor={`tipo-${t}`} className="cursor-pointer text-sm font-normal capitalize">
                {t}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Ciudad */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Ciudad
        </Label>
        <Select value={search.ciudad} onValueChange={(v) => setSearch({ ciudad: v })}>
          <SelectTrigger className="mt-3"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las ciudades</SelectItem>
            {CITIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Precio máximo */}
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Precio máximo
          </Label>
          <span className="text-xs font-medium text-foreground">
            {formatCOP(search.precioMax)}
          </span>
        </div>
        <Slider
          value={[search.precioMax]}
          min={100_000_000}
          max={PRICE_MAX_DEFAULT}
          step={100_000_000}
          onValueChange={(v) => setSearch({ precioMax: v[0] })}
          className="mt-4"
        />
      </div>

      {/* Habitaciones */}
      <div>
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Habitaciones mínimas
        </Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { v: 0, l: "Todas" },
            { v: 1, l: "1+" },
            { v: 2, l: "2+" },
            { v: 3, l: "3+" },
            { v: 4, l: "4+" },
          ].map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setSearch({ habMin: opt.v })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                search.habMin === opt.v
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="w-full">
          <X className="mr-1.5 h-3.5 w-3.5" />
          Limpiar filtros ({activeFilterCount})
        </Button>
      )}
    </div>
  );

  return (
    <PublicLayout>
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
            Catálogo
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Propiedades disponibles
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Una selección curada de inmuebles para venta y arriendo en Colombia.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Sidebar filtros desktop */}
          <aside className="hidden lg:block">
            <Card className="sticky top-20 rounded-xl border-border p-6">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">Filtros</h2>
              <div className="mt-5">
                <ClientOnly
                  fallback={
                    <div className="space-y-4" aria-hidden="true">
                      <div className="h-4 w-24 rounded bg-muted" />
                      <div className="h-8 w-full rounded bg-muted/60" />
                      <div className="h-8 w-full rounded bg-muted/60" />
                      <div className="h-8 w-full rounded bg-muted/60" />
                      <div className="h-4 w-20 rounded bg-muted" />
                      <div className="h-8 w-full rounded bg-muted/60" />
                    </div>
                  }
                >
                  {FiltersPanel}
                </ClientOnly>
              </div>
            </Card>
          </aside>

          {/* Main */}
          <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Botón filtros móvil */}
                <ClientOnly
                  fallback={
                    <Button variant="outline" size="sm" className="lg:hidden" disabled>
                      <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                      Filtros
                    </Button>
                  }
                >
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden">
                      <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                      Filtros
                      {activeFilterCount > 0 && (
                        <span className="ml-1.5 rounded-full bg-foreground px-1.5 text-[10px] font-semibold text-background">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[320px] overflow-y-auto sm:w-[380px]">
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">{FiltersPanel}</div>
                  </SheetContent>
                </Sheet>
                </ClientOnly>

                <p className="text-sm text-muted-foreground">
                  {isLoading
                    ? "Cargando…"
                    : `${total} ${total === 1 ? "propiedad" : "propiedades"}`}
                </p>
              </div>

              <ClientOnly
                fallback={
                  <div
                    className="flex h-9 w-[200px] items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground"
                    aria-hidden="true"
                  >
                    Más recientes
                  </div>
                }
              >
                <Select value={search.sort} onValueChange={(v) => setSearch({ sort: v as typeof DEFAULTS.sort })}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recientes">Más recientes</SelectItem>
                    <SelectItem value="precio-asc">Precio ascendente</SelectItem>
                    <SelectItem value="precio-desc">Precio descendente</SelectItem>
                    <SelectItem value="destacados">Destacados primero</SelectItem>
                  </SelectContent>
                </Select>
              </ClientOnly>
            </div>

            {/* Grid */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <PropertyCardSkeleton key={i} />)
              ) : isError ? (
                <div className="col-span-full rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
                  <p className="text-sm font-medium text-destructive">
                    No pudimos cargar las propiedades
                  </p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
                    Reintentar
                  </Button>
                </div>
              ) : pageItems.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
                  <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-4 text-base font-medium text-foreground">
                    No encontramos propiedades con estos filtros
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Intenta con criterios más amplios o limpia los filtros.
                  </p>
                  {activeFilterCount > 0 && (
                    <Button onClick={clearAll} className="mt-5" variant="outline">
                      <X className="mr-1.5 h-4 w-4" />
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              ) : (
                pageItems.map((p) => (
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
                      created_at: p.created_at,
                    }}
                  />
                ))
              )}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearch({ page: Math.max(1, currentPage - 1) })}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearch({ page: Math.min(totalPages, currentPage + 1) })}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* CTA alertas */}
            <div className="mt-12 rounded-2xl border border-border bg-secondary/40 p-8 text-center sm:p-10">
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                ¿No encontraste lo que buscas?
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                Regístrate y te avisamos cuando publiquemos algo nuevo que coincida con tus criterios.
              </p>
              <div className="mt-5 flex justify-center">
                <AlertsModal />
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
