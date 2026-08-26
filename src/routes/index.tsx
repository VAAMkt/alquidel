import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  Award,
  Building2,
  Headset,
  Home as HomeIcon,
  MapPin,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PropertyCard } from "@/components/public/PropertyCard";
import { PropertyCardSkeleton } from "@/components/public/PropertyCardSkeleton";
import { RecentViews } from "../components/public/RecentViews";
import { ClientOnly } from "@/components/common/ClientOnly";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY } from "@/lib/company";
import heroBogota from "@/assets/hero-bogota.jpg";

const PROPERTY_TYPES = [
  "apartamento",
  "casa",
  "local",
  "oficina",
  "lote",
  "bodega",
] as const;

// Lista cerrada: solo ciudades con inventario real.
const CITIES = ["Bogotá", "Chía", "Cajicá", "Cali", "Mosquera"] as const;

// Query options compartidos para que el loader y el componente compartan caché
const featuredQueryOptions = queryOptions({
  queryKey: ["properties", "featured"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("properties")
      .select(
        "id, slug, title, type, price, area_m2, bedrooms, bathrooms, neighborhood, city, images, is_featured",
      )
      .eq("is_featured", true)
      .eq("status", "disponible")
      .order("created_at", { ascending: false })
      .limit(6);
    if (error) throw error;
    return data ?? [];
  },
  staleTime: 5 * 60_000,
});

const recentSixQueryOptions = queryOptions({
  queryKey: ["properties", "recent-6"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("properties")
      .select(
        "id, slug, title, type, price, area_m2, bedrooms, bathrooms, neighborhood, city, images, is_featured",
      )
      .eq("status", "disponible")
      .order("created_at", { ascending: false })
      .limit(6);
    if (error) throw error;
    return data ?? [];
  },
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${COMPANY.shortName} — Menos búsqueda. Más criterio.` },
      {
        name: "description",
        content:
          "Compra, arrienda o invierte en Bogotá, Chía, Cajicá y Cali — con asesoría real en cada paso.",
      },
      {
        property: "og:title",
        content: `${COMPANY.shortName} — Menos búsqueda. Más criterio.`,
      },
      {
        property: "og:description",
        content:
          "Compra, arrienda o invierte en Bogotá, Chía, Cajicá y Cali — con asesoría real en cada paso.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: heroBogota },
      { name: "twitter:image", content: heroBogota },
      { property: "og:url", content: "https://alquidel.com/" },
    ],
    links: [{ rel: "canonical", href: "https://alquidel.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Alquidel Bienes Raíces",
          url: "https://alquidel.com",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://alquidel.com/propiedades?ciudad={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  loader: async ({ context }) => {
    // Pre-cargar destacadas y devolverlas para SSR + hidratación consistentes
    const featured = await context.queryClient.ensureQueryData(featuredQueryOptions);
    let recent: typeof featured = [];
    if (!featured || featured.length === 0) {
      recent = await context.queryClient.ensureQueryData(recentSixQueryOptions);
    }
    return { featured, recent };
  },
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { featured: initialFeatured, recent: initialRecent } = Route.useLoaderData();
  // Tres intenciones de usuario: comprar, arrendar o invertir.
  const [op, setOp] = useState<"todos" | "comprar" | "arrendar" | "invertir">("todos");
  const [tipo, setTipo] = useState<string>("todos");
  const [ciudad, setCiudad] = useState<string>("todas");

  function handleSearch() {
    // "Comprar" e "Invertir" apuntan al inventario en venta; invertir además
    // prioriza la selección destacada.
    const operacion =
      op === "arrendar" ? "arriendo" : op === "todos" ? undefined : "venta";
    // IMPORTANTE: pasamos search como función para que TanStack Router
    // valide correctamente con el schema de /propiedades (tipos como array).
    navigate({
      to: "/propiedades",
      search: () => ({
        ...(operacion ? { operacion } : {}),
        ...(op === "invertir" ? { sort: "destacados" as const } : {}),
        ...(tipo !== "todos" ? { tipos: [tipo as any] } : {}),
        ...(ciudad !== "todas" ? { ciudad } : {}),
        page: 1,
      }),
    });
  }

  // Destacadas
  const { data: featured } = useQuery({
    ...featuredQueryOptions,
    initialData: initialFeatured,
  });

  // Fallback: si no hay destacadas → 6 más recientes
  const { data: fallbackRecent } = useQuery({
    ...recentSixQueryOptions,
    initialData: initialRecent,
    enabled: featured !== undefined && featured.length === 0,
  });

  const showcase = featured && featured.length > 0 ? featured : fallbackRecent;
  const isLoadingShowcase = !showcase;

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        {/* Imagen de fondo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBogota})` }}
        />
        {/* Capa blanca para preservar contraste */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background/85 via-background/80 to-background"
        />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
              <Sparkles className="h-3 w-3 text-accent" />
              Inmobiliaria colombiana · Bogotá
            </div>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Menos búsqueda. <span className="text-accent">Más criterio.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              Propiedades seleccionadas. Asesoría real. Decisiones inmobiliarias con
              respaldo en Bogotá, Chía, Cajicá y Cali.
            </p>
          </div>

          {/* Buscador */}
          <Card className="mx-auto mt-10 max-w-4xl rounded-2xl border-border bg-background/95 p-3 shadow-sm backdrop-blur sm:p-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <ClientOnly
                fallback={
                  <div
                    className="flex h-12 items-center rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground"
                    aria-hidden="true"
                  >
                    ¿Qué estás buscando?
                  </div>
                }
              >
                <Select value={op} onValueChange={(v) => setOp(v as typeof op)}>
                  <SelectTrigger className="h-12 rounded-lg border-border">
                    <SelectValue placeholder="¿Qué estás buscando?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Comprar, arrendar o invertir</SelectItem>
                    <SelectItem value="comprar">Comprar</SelectItem>
                    <SelectItem value="arrendar">Arrendar</SelectItem>
                    <SelectItem value="invertir">Invertir</SelectItem>
                  </SelectContent>
                </Select>
              </ClientOnly>
              <ClientOnly
                fallback={
                  <div
                    className="flex h-12 items-center rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground"
                    aria-hidden="true"
                  >
                    Tipo de inmueble
                  </div>
                }
              >
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="h-12 rounded-lg border-border capitalize">
                    <SelectValue placeholder="Tipo de inmueble" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los inmuebles</SelectItem>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ClientOnly>
              <ClientOnly
                fallback={
                  <div
                    className="flex h-12 items-center rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground"
                    aria-hidden="true"
                  >
                    Ciudad
                  </div>
                }
              >
                <Select value={ciudad} onValueChange={setCiudad}>
                  <SelectTrigger className="h-12 rounded-lg border-border">
                    <SelectValue placeholder="Ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las ciudades</SelectItem>
                    {CITIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ClientOnly>
              <Button
                size="lg"
                onClick={handleSearch}
                className="h-12 rounded-lg px-6"
              >
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA PROPIETARIOS */}
      <section className="border-y border-border bg-primary/5">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
              ¿Eres propietario?
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Vende o arrienda tu inmueble con acompañamiento completo
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Avalúo comercial, fotografía, publicación y filtro de interesados. Te
              contactamos en menos de 24 horas hábiles.
            </p>
          </div>
          <Button asChild size="lg" className="h-12 rounded-lg px-6">
            <Link to="/propietarios">
              Consignar mi inmueble
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>


      {/* DESTACADAS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
              Selección
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Propiedades destacadas
            </h2>
          </div>
          <Link
            to="/propiedades"
            className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex sm:items-center"
          >
            Ver todo <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoadingShowcase ? (
            Array.from({ length: 3 }).map((_, i) => <PropertyCardSkeleton key={i} />)
          ) : showcase && showcase.length > 0 ? (
            showcase.map((p) => (
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
            ))
          ) : (
            <div className="col-span-full rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Pronto publicaremos nuestra selección.
              </p>
            </div>
          )}
        </div>

        {/* Vistas recientes */}
        <ClientOnly>
          <RecentViews />
        </ClientOnly>
      </section>

      {/* CONFIANZA */}
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            {
              icon: HomeIcon,
              title: "8+ Propiedades exclusivas",
              desc: "Catálogo curado de inmuebles seleccionados con criterio.",
            },
            {
              icon: MapPin,
              title: "Bogotá y Colombia",
              desc: "Presencia en las principales ciudades del país.",
            },
            {
              icon: Headset,
              title: "Asesoría personalizada",
              desc: "Acompañamiento integral en cada paso del proceso.",
            },
          ].map((item) => (
            <Card
              key={item.title}
              className="rounded-xl border-border bg-background p-6"
            >
              <item.icon className="h-6 w-6 text-accent" />
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ¿POR QUÉ ALQUIDEL? */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
            Nuestra promesa
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            ¿Por qué Alquidel?
          </h2>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <div>
            <Award className="h-7 w-7 text-accent" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Experiencia
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Trabajamos profesionalmente para prestar el mejor y más completo
              servicio inmobiliario.
            </p>
          </div>
          <div>
            <Building2 className="h-7 w-7 text-accent" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Servicio integral
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Servicios completos basados en las necesidades de cada cliente, para
              brindar la mejor asesoría inmobiliaria.
            </p>
          </div>
          <div>
            <Users className="h-7 w-7 text-accent" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              Clientes de por vida
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              No buscamos transacciones, buscamos relaciones duraderas que mejoren
              la calidad de vida de nuestros clientes.
            </p>
          </div>
        </div>

        <div className="mt-12 flex justify-center">
          <Button asChild size="lg" className="rounded-lg">
            <Link to="/propiedades">
              Explorar propiedades
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* BÚSQUEDAS POR CIUDAD */}
      <section className="border-t border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Busca por ciudad
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventario disponible en las ciudades donde operamos.
          </p>
          <div className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {CITY_LANDINGS.map((c) => (
              <div key={c.slug} className="flex flex-wrap items-center gap-x-3 text-sm">
                <span className="font-medium text-foreground">{c.label}:</span>
                <Link
                  to="/arriendos/$ciudad"
                  params={{ ciudad: c.slug }}
                  className="text-muted-foreground hover:text-accent"
                >
                  arriendo
                </Link>
                <span className="text-border">·</span>
                <Link
                  to="/venta/$ciudad"
                  params={{ ciudad: c.slug }}
                  className="text-muted-foreground hover:text-accent"
                >
                  venta
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
