import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, MessageCircle } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PropertyCard } from "@/components/public/PropertyCard";
import { PropertyCardSkeleton } from "@/components/public/PropertyCardSkeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cityLandingQueryOptions } from "@/lib/landings.query";
import { OPERACION_COPY, type CityLanding, type Operacion } from "@/lib/landings";
import { whatsappUrl } from "@/lib/whatsapp";
import { trackWhatsApp, trackOwnerCta } from "@/lib/analytics";

const TYPE_PLURAL: Record<string, string> = {
  apartamento: "Apartamentos",
  casa: "Casas",
  oficina: "Oficinas",
  local: "Locales",
  bodega: "Bodegas",
  lote: "Lotes",
};

export function CityLandingPage({ city, operacion }: { city: CityLanding; operacion: Operacion }) {
  const copy = OPERACION_COPY[operacion];
  const other: Operacion = operacion === "arriendo" ? "venta" : "arriendo";
  const otherCopy = OPERACION_COPY[other];

  const { data, isLoading } = useQuery(cityLandingQueryOptions(city.city, operacion));
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  const barrios = Array.from(
    new Set(rows.map((r) => r.neighborhood).filter((n): n is string => !!n && n.trim() !== "")),
  ).slice(0, 12);

  const tipos = Array.from(new Set(rows.map((r) => r.property_type as string)));

  return (
    <PublicLayout>
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <nav aria-label="Ruta de navegación" className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Inicio
            </Link>
            <span className="mx-1.5">/</span>
            <Link to="/propiedades" className="hover:text-foreground">
              Propiedades
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-foreground">
              {copy.label} en {city.label}
            </span>
          </nav>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Inmuebles {copy.verb} en {city.label}
          </h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">{city.intro}</p>
          {total > 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              {total === 1 ? "1 inmueble disponible" : `${total} inmuebles disponibles`} {copy.verb}{" "}
              en {city.label}
              {tipos.length > 0 && (
                <>
                  {" · "}
                  {tipos.map((t) => (TYPE_PLURAL[t] ?? t).toLowerCase()).join(", ")}
                </>
              )}
              .
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <PropertyCardSkeleton key={i} />)
          ) : rows.length > 0 ? (
            rows.map((p) => (
              <PropertyCard
                key={p.id}
                p={{
                  id: p.id,
                  slug: p.slug,
                  title: p.title,
                  type: p.type as Operacion,
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
          ) : (
            <div className="col-span-full rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                En este momento no tenemos inmuebles {copy.verb} publicados en {city.label}.
                Escríbenos y te avisamos apenas ingrese uno.
              </p>
              <Button asChild className="mt-6 rounded-lg">
                <Link to="/contacto">Quiero que me avisen</Link>
              </Button>
            </div>
          )}
        </div>

        {total > rows.length && (
          <div className="mt-10 text-center">
            <Button asChild size="lg" variant="outline" className="rounded-lg">
              <Link to="/propiedades" search={{ operacion, ciudad: city.city, page: 1 }}>
                Ver todo el inventario {copy.verb} en {city.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}

        {barrios.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Sectores con inmuebles {copy.verb} en {city.label}
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {barrios.map((b) => (
                <span
                  key={b}
                  className="rounded-full border border-border bg-background px-3 py-1 text-sm text-muted-foreground"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cómo trabajamos: contenido útil y verificable */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <Card className="rounded-xl border-border p-6">
            <h2 className="text-base font-semibold text-foreground">
              Qué necesitas para {operacion === "arriendo" ? "arrendar" : "comprar"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {operacion === "arriendo"
                ? "Documento de identidad, certificación laboral o de ingresos, extractos recientes y estudio de arrendamiento. Te indicamos el listado exacto según el inmueble antes de la visita."
                : "Definición de presupuesto y forma de pago (recursos propios o crédito), estudio de títulos del inmueble y promesa de compraventa. Te acompañamos en cada paso hasta la escrituración."}
            </p>
          </Card>
          <Card className="rounded-xl border-border p-6">
            <h2 className="text-base font-semibold text-foreground">Cómo agendamos visitas</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Escríbenos por WhatsApp o déjanos tus datos: confirmamos disponibilidad real del
              inmueble y coordinamos la visita con un asesor de {city.label}.
            </p>
          </Card>
          <Card className="rounded-xl border-border p-6">
            <h2 className="text-base font-semibold text-foreground">
              También {otherCopy.verb} en {city.label}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              ¿Buscas {otherCopy.noun} en lugar de {copy.noun}? Revisa el inventario disponible.
            </p>
            <Link
              to={other === "arriendo" ? "/arriendos/$ciudad" : "/venta/$ciudad"}
              params={{ ciudad: city.slug }}
              className="mt-3 inline-flex items-center text-sm font-medium text-accent hover:underline"
            >
              Ver inmuebles {otherCopy.verb} en {city.label}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>

        {/* CTA */}
        <div className="mt-14 flex flex-col items-start gap-4 rounded-2xl border border-border bg-primary/5 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              ¿Tienes un inmueble en {city.label}?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lo avaluamos, lo publicamos y filtramos a los interesados por ti.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-lg">
              <Link
                to="/propietarios"
                onClick={() => trackOwnerCta("consignar", `landing-${city.slug}`)}
              >
                Consignar mi inmueble
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-lg border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              <a
                href={whatsappUrl(`Hola, me interesan inmuebles ${copy.verb} en ${city.label}.`)}
                onClick={() => trackWhatsApp(`landing-${city.slug}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-1.5 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
