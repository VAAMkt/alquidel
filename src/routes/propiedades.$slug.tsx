import {
  createFileRoute,
  Link,
  notFound,
  useRouter,
} from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bath,
  Bed,
  Building2,
  Calculator,
  CalendarCheck,
  Check,
  Mail,
  MapPin,
  Maximize,
  MessageCircle,
  Phone,
  Printer,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { PropertyImagePlaceholder } from "@/components/public/PropertyImagePlaceholder";
import { PropertyCard, type PropertyCardData } from "@/components/public/PropertyCard";
import { supabase } from "@/integrations/supabase/client";
import { formatCOP, formatArea, displayPrice } from "@/lib/format";
import { COMPANY } from "@/lib/company";
import { whatsappUrl, propertyWhatsappMessage, shareWhatsappUrl } from "@/lib/whatsapp";
import { useEffect } from "react";
import { useRecentViews } from "@/hooks/useRecentViews";

async function fetchPropertyBySlug(slug: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchSimilarProperties(opts: {
  city: string;
  type: "venta" | "arriendo";
  excludeId: string;
}): Promise<PropertyCardData[]> {
  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, slug, title, type, price, area_m2, bedrooms, bathrooms, city, neighborhood, images, is_featured, created_at",
    )
    .eq("city", opts.city)
    .eq("type", opts.type)
    .neq("id", opts.excludeId)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) {
    console.error("[propiedad] Error cargando similares:", error);
    return [];
  }
  return (data ?? []) as PropertyCardData[];
}

export const Route = createFileRoute("/propiedades/$slug")({
  loader: async ({ params }) => {
    const property = await fetchPropertyBySlug(params.slug);
    if (!property) throw notFound();
    const similar = await fetchSimilarProperties({
      city: property.city,
      type: property.type as "venta" | "arriendo",
      excludeId: property.id,
    });
    return { property, similar };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.property) return { meta: [{ title: "Propiedad | Alquidel" }] };
    const p = loaderData.property;
    const desc = (p.description ?? "").slice(0, 155);
    const baseMeta = [
      { title: `${p.title} | ${COMPANY.name}` },
      { name: "description", content: desc || `${p.title} en ${p.city}` },
      { property: "og:title", content: `${p.title} | ${COMPANY.shortName}` },
      { property: "og:description", content: desc || `${p.title} en ${p.city}` },
      { property: "og:type", content: "article" },
    ];
    if (p.images?.[0]) {
      baseMeta.push(
        { property: "og:image", content: p.images[0] },
        { name: "twitter:image", content: p.images[0] },
      );
    }
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: p.title,
      description: p.description ?? "",
      url: `/propiedades/${p.slug}`,
      image: p.images ?? [],
      address: {
        "@type": "PostalAddress",
        addressLocality: p.city,
        addressCountry: "CO",
        streetAddress: p.address ?? p.neighborhood ?? undefined,
      },
      floorSize: {
        "@type": "QuantitativeValue",
        value: p.area_m2,
        unitCode: "MTK",
      },
      numberOfBedrooms: p.bedrooms,
      numberOfBathroomsTotal: p.bathrooms,
      offers: {
        "@type": "Offer",
        price: p.price,
        priceCurrency: "COP",
        availability:
          p.status === "disponible"
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
      },
    };
    return {
      meta: baseMeta,
      links: [
        { rel: "canonical", href: `https://alquidel.lovable.app/propiedades/${p.slug}` },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button asChild className="mt-6"><Link to="/propiedades">Volver al catálogo</Link></Button>
      </div>
    </PublicLayout>
  ),
  notFoundComponent: () => (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold text-foreground">
          Propiedad no encontrada
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          La propiedad que buscas no existe o fue retirada del catálogo.
        </p>
        <Button asChild className="mt-6"><Link to="/propiedades">Ver propiedades disponibles</Link></Button>
      </div>
    </PublicLayout>
  ),
  component: PropertyDetail,
});

const leadSchema = z.object({
  name: z.string().trim().min(1, "Tu nombre es requerido").max(200),
  email: z.string().trim().email("Email inválido").max(320),
  phone: z.string().trim().max(50).optional(),
  message: z.string().trim().max(2000),
});

const statusBadge: Record<string, string> = {
  disponible: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  vendido: "bg-red-100 text-red-800 hover:bg-red-100",
  arrendado: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  reservado: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
};

function PropertyDetail() {
  const { property: p, similar } = Route.useLoaderData();
  const router = useRouter();
  const [activeImg, setActiveImg] = useState(0);
  const { push: pushRecent } = useRecentViews();

  useEffect(() => {
    if (p?.slug) pushRecent(p.slug);
  }, [p?.slug, pushRecent]);

  const waLink = whatsappUrl(propertyWhatsappMessage(p.title));
  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://alquidel.lovable.app/propiedades/${p.slug}`;
  const shareWa = shareWhatsappUrl(p.title, shareUrl);

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  // Lead form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: propertyWhatsappMessage(p.title),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const leadMutation = useMutation({
    mutationFn: async () => {
      const parsed = leadSchema.safeParse(form);
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) errs[issue.path.join(".")] = issue.message;
        setErrors(errs);
        throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      }
      setErrors({});
      const { error } = await supabase.from("leads").insert({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        message: parsed.data.message,
        source: "formulario",
        status: "nuevo",
        property_id: p.id,
      });
      if (error) {
        console.error("[propiedad] Error guardando lead:", error);
        throw new Error(
          error.message ||
            "No pudimos enviar tu consulta. Intenta de nuevo o escríbenos por WhatsApp.",
        );
      }
    },
    onSuccess: () => {
      toast.success("¡Consulta enviada! Te contactaremos pronto.");
      setForm({
        name: "",
        email: "",
        phone: "",
        message: propertyWhatsappMessage(p.title),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Calculadora hipotecaria
  const [calcValor, setCalcValor] = useState<number>(Number(p.price));
  const [calcEnganche, setCalcEnganche] = useState<number>(30);
  const [calcTasa, setCalcTasa] = useState<number>(11);
  const [calcPlazo, setCalcPlazo] = useState<number>(20);

  const { monto, cuota } = useMemo(() => {
    const monto = calcValor * (1 - calcEnganche / 100);
    const i = calcTasa / 100 / 12;
    const n = calcPlazo * 12;
    const cuota =
      i === 0 ? monto / n : (monto * i) / (1 - Math.pow(1 + i, -n));
    return { monto, cuota: Number.isFinite(cuota) ? cuota : 0 };
  }, [calcValor, calcEnganche, calcTasa, calcPlazo]);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Propiedades", to: "/propiedades" },
            { label: p.title },
          ]}
        />
        <button
          type="button"
          onClick={() => router.history.back()}
          className="no-print mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </button>

        {/* Acciones rápidas: compartir e imprimir */}
        <div className="no-print mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href={shareWa}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Compartir por WhatsApp"
            >
              <Share2 className="mr-1.5 h-4 w-4" /> Compartir por WhatsApp
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} aria-label="Imprimir ficha">
            <Printer className="mr-1.5 h-4 w-4" /> Imprimir ficha
          </Button>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          {/* IZQUIERDA */}
          <div className="space-y-8 lg:col-span-2">
            {/* Galería */}
            <div>
              <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-muted">
                {p.images && p.images.length > 0 ? (
                  <img
                    src={p.images[activeImg]}
                    alt={p.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Building2 className="h-20 w-20 text-muted-foreground" />
                  </div>
                )}
              </div>
              {p.images && p.images.length > 1 && (
                <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                  {p.images.map((img: string, idx: number) => (
                    <button
                      key={img + idx}
                      type="button"
                      onClick={() => setActiveImg(idx)}
                      className={`aspect-square overflow-hidden rounded-md ring-2 transition ${
                        idx === activeImg ? "ring-foreground" : "ring-transparent hover:ring-border"
                      }`}
                    >
                      <img src={img} alt={`${p.title} ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Header */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    p.type === "venta"
                      ? "rounded-md bg-slate-800 text-slate-50 hover:bg-slate-800"
                      : "rounded-md bg-amber-500 text-white hover:bg-amber-500"
                  }
                >
                  {p.type === "venta" ? "Venta" : "Arriendo"}
                </Badge>
                <Badge className={`rounded-md capitalize ${statusBadge[p.status] ?? ""}`}>
                  {p.status}
                </Badge>
                <Badge variant="outline" className="rounded-md capitalize">
                  {p.property_type}
                </Badge>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {p.title}
              </h1>
              <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {p.neighborhood ? `${p.neighborhood}, ${p.city}` : p.city}
              </p>
              <p className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {displayPrice(p.price)}
              </p>
            </div>

            {/* Chips datos clave */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Maximize, label: "Área", value: formatArea(Number(p.area_m2)) },
                { icon: Bed, label: "Habitaciones", value: String(p.bedrooms) },
                { icon: Bath, label: "Baños", value: String(p.bathrooms) },
                { icon: MapPin, label: "Ciudad", value: p.city },
              ].map((c) => (
                <Card key={c.label} className="rounded-lg border-border p-4">
                  <c.icon className="h-4 w-4 text-accent" />
                  <p className="mt-2 text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-sm font-semibold text-foreground">{c.value}</p>
                </Card>
              ))}
            </div>

            {/* Descripción */}
            {p.description && (
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">Descripción</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
              </div>
            )}

            {/* Amenidades */}
            {p.amenities && p.amenities.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  Amenidades y características
                </h2>
                <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {p.amenities.map((a: string) => (
                    <li key={a} className="inline-flex items-center gap-2 text-sm text-foreground">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-accent">
                        <Check className="h-3 w-3" />
                      </span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ubicación */}
            <Card className="rounded-xl border-border p-5">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Ubicación</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sector: {p.neighborhood ? `${p.neighborhood}, ${p.city}` : p.city}
                  </p>
                  {p.address && (
                    <p className="mt-1 text-sm text-muted-foreground">{p.address}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Calculadora hipotecaria */}
            <Accordion type="single" collapsible>
              <AccordionItem value="calc" className="rounded-xl border border-border px-5">
                <AccordionTrigger className="hover:no-underline">
                  <span className="inline-flex items-center gap-2 text-base font-semibold text-foreground">
                    <Calculator className="h-4 w-4 text-accent" />
                    Calculadora hipotecaria
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-5 pb-2 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="calc-valor">Valor del inmueble</Label>
                      <Input
                        id="calc-valor"
                        inputMode="numeric"
                        value={
                          calcValor === 0 ? "" : new Intl.NumberFormat("es-CO").format(calcValor)
                        }
                        onChange={(e) => {
                          const clean = e.target.value.replace(/\D/g, "");
                          setCalcValor(clean ? Number(clean) : 0);
                        }}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>Plazo (años)</Label>
                      <Select
                        value={String(calcPlazo)}
                        onValueChange={(v) => setCalcPlazo(Number(v))}
                      >
                        <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[5, 10, 15, 20].map((y) => (
                            <SelectItem key={y} value={String(y)}>{y} años</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <Label>Cuota inicial</Label>
                        <span className="text-xs text-muted-foreground">{calcEnganche}%</span>
                      </div>
                      <Slider
                        value={[calcEnganche]}
                        min={10}
                        max={50}
                        step={1}
                        onValueChange={(v) => setCalcEnganche(v[0])}
                        className="mt-3"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calc-tasa">Tasa anual (%)</Label>
                      <Input
                        id="calc-tasa"
                        type="number"
                        step="0.1"
                        min={0}
                        max={50}
                        value={calcTasa}
                        onChange={(e) => setCalcTasa(Number(e.target.value) || 0)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <Card className="rounded-lg border-border bg-secondary/40 p-4">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        Monto financiado
                      </p>
                      <p className="mt-1 text-xl font-semibold text-foreground">{formatCOP(monto)}</p>
                    </Card>
                    <Card className="rounded-lg border-border bg-accent/10 p-4">
                      <p className="text-xs uppercase tracking-wider text-accent">Cuota mensual</p>
                      <p className="mt-1 text-xl font-semibold text-foreground">{formatCOP(cuota)}</p>
                    </Card>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Estimación referencial con amortización francesa. Consulta con tu entidad
                    financiera para condiciones reales.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* DERECHA — sticky */}
          <aside className="space-y-4 lg:col-span-1">
            <div className="lg:sticky lg:top-20 space-y-4">
              {/* Formulario contacto */}
              <Card className="rounded-xl border-border p-6">
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <CalendarCheck className="h-4 w-4 text-accent" />
                  Solicitar visita
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Déjanos tus datos y coordinamos una visita a la propiedad.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    leadMutation.mutate();
                  }}
                  className="mt-5 space-y-3"
                >
                  <div>
                    <Input
                      placeholder="Nombre *"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="Email *"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                    {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                  </div>
                  <Input
                    type="tel"
                    placeholder="Teléfono"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                  <Textarea
                    rows={3}
                    placeholder="Mensaje (fechas y horarios preferidos para la visita)"
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  />
                  <Button type="submit" className="w-full" disabled={leadMutation.isPending}>
                    <CalendarCheck className="mr-1.5 h-4 w-4" />
                    {leadMutation.isPending ? "Enviando…" : "Solicitar visita"}
                  </Button>
                </form>

                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  Consultar por WhatsApp
                </a>
              </Card>

              {/* Info Alquidel */}
              <Card className="rounded-xl border-border p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {COMPANY.shortName}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                    <a href={COMPANY.phoneHref} className="hover:text-foreground">
                      {COMPANY.phone}
                    </a>
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                    <a href={COMPANY.emailHref} className="hover:text-foreground">
                      {COMPANY.email}
                    </a>
                  </li>
                  <li className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{COMPANY.address}</span>
                  </li>
                </ul>
              </Card>
            </div>
          </aside>
        </div>

        {/* Propiedades similares */}
        {similar.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Propiedades similares
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Otras opciones en {p.city} para {p.type === "venta" ? "compra" : "arriendo"}.
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => (
                <PropertyCard key={s.id} p={s} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* FAB móvil WhatsApp */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed inset-x-4 bottom-4 z-30 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition-colors hover:bg-emerald-700 lg:hidden"
      >
        <MessageCircle className="h-4 w-4" />
        Contactar por WhatsApp
      </a>
    </PublicLayout>
  );
}
