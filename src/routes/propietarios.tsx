import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Camera, CheckCircle2, MessageCircle, Send, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ClientOnly } from "@/components/common/ClientOnly";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY } from "@/lib/company";
import { whatsappUrl } from "@/lib/whatsapp";
import { trackWhatsApp, trackLeadSubmit } from "@/lib/analytics";

const TITLE = "Vende o arrienda tu inmueble | Alquidel Bienes Raíces";
const DESCRIPTION =
  "Consigna tu apartamento, casa, oficina o local con Alquidel: avalúo comercial, fotografía profesional, publicación y filtro de interesados en Bogotá y alrededores.";

export const Route = createFileRoute("/propietarios")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://alquidel.com/propietarios" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "https://alquidel.com/propietarios" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Consignación de inmuebles",
          serviceType: "Comercialización inmobiliaria",
          areaServed: ["Bogotá", "Chía", "Cajicá", "Cali", "Mosquera"],
          provider: {
            "@type": "RealEstateAgent",
            name: COMPANY.name,
            url: "https://alquidel.com",
            telephone: COMPANY.phone,
            email: COMPANY.email,
          },
        }),
      },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { intencion?: "vender" | "arrendar" } =>
    search["intencion"] === "arrendar" || search["intencion"] === "vender"
      ? { intencion: search["intencion"] as "vender" | "arrendar" }
      : {},
  component: PropietariosPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Tu nombre es requerido").max(200),
  email: z.string().trim().email("Email inválido").max(320),
  phone: z.string().trim().min(7, "Necesitamos un teléfono de contacto").max(50),
  intent: z.enum(["vender", "arrendar"]),
  propertyType: z.string().trim().min(1).max(60),
  city: z.string().trim().min(1, "Indica la ciudad").max(120),
  message: z.string().trim().max(2000).optional(),
});

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Avalúo comercial",
    desc: "Definimos un precio competitivo con datos reales del sector, no estimaciones al azar.",
  },
  {
    icon: Camera,
    title: "Fotografía y publicación",
    desc: "Registro fotográfico profesional y difusión en nuestro portal y portales aliados.",
  },
  {
    icon: Users,
    title: "Filtro de interesados",
    desc: "Verificamos capacidad de pago y coordinamos visitas para que no pierdas tiempo.",
  },
  {
    icon: CheckCircle2,
    title: "Cierre acompañado",
    desc: "Contratos, estudio de documentos y entrega, con acompañamiento hasta la firma.",
  },
];

function PropietariosPage() {
  const { intencion } = Route.useSearch();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    intent: (intencion ?? "vender") as "vender" | "arrendar",
    propertyType: "apartamento",
    city: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        for (const issue of parsed.error.issues) errs[issue.path.join(".")] = issue.message;
        setErrors(errs);
        throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      }
      setErrors({});
      const d = parsed.data;
      const detail = [
        `Quiere ${d.intent} un(a) ${d.propertyType} en ${d.city}.`,
        d.message?.trim() ? d.message.trim() : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      const { error } = await supabase.from("leads").insert({
        name: d.name,
        email: d.email,
        phone: d.phone,
        message: detail,
        source: "propietario",
        status: "nuevo",
        property_id: null,
      });
      if (error) {
        console.error("[propietarios] Error guardando lead:", error);
        throw new Error(
          "No pudimos enviar tu solicitud. Intenta de nuevo o escríbenos por WhatsApp.",
        );
      }
    },
    onSuccess: () => {
      trackLeadSubmit("propietarios", { source: "propietario", intent: form.intent });
      toast.success("¡Recibido! Un asesor te contactará en menos de 24 horas hábiles.");
      setForm((f) => ({ ...f, name: "", email: "", phone: "", city: "", message: "" }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PublicLayout>
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">
            Propietarios
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Vende o arrienda tu inmueble sin desgaste
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Nos encargamos del avalúo, la publicación, las visitas y el cierre. Tú
            decides; nosotros hacemos el trabajo pesado.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {BENEFITS.map((b) => (
                <Card key={b.title} className="rounded-xl border-border p-6">
                  <b.icon className="h-6 w-6 text-accent" />
                  <h2 className="mt-4 text-base font-semibold text-foreground">{b.title}</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">{b.desc}</p>
                </Card>
              ))}
            </div>

            <a
              href={whatsappUrl("Hola, quiero consignar mi inmueble con Alquidel.")}
              onClick={() => trackWhatsApp("propietarios")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <MessageCircle className="h-5 w-5" />
              Prefiero hablar por WhatsApp
            </a>
          </div>

          <Card className="rounded-xl border-border p-6 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Cuéntanos sobre tu inmueble
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Te contactamos en menos de 24 horas hábiles.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              className="mt-6 space-y-4"
            >
              <div>
                <Label htmlFor="p-name">Nombre *</Label>
                <Input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1.5"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "p-name-error" : undefined}
                  aria-required="true"
                />
                {errors.name && (
                  <p id="p-name-error" className="mt-1 text-xs text-destructive">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="p-email">Email *</Label>
                  <Input
                    id="p-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1.5"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "p-email-error" : undefined}
                    aria-required="true"
                  />
                  {errors.email && (
                    <p id="p-email-error" className="mt-1 text-xs text-destructive">
                      {errors.email}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="p-phone">Teléfono *</Label>
                  <Input
                    id="p-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="mt-1.5"
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "p-phone-error" : undefined}
                    aria-required="true"
                  />
                  {errors.phone && (
                    <p id="p-phone-error" className="mt-1 text-xs text-destructive">
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="p-intent">Quiero</Label>
                  <ClientOnly
                    fallback={
                      <div
                        className="mt-1.5 flex h-9 items-center rounded-md border border-border px-3 text-sm text-muted-foreground"
                        aria-hidden="true"
                      >
                        Vender
                      </div>
                    }
                  >
                    <Select
                      value={form.intent}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, intent: v as "vender" | "arrendar" }))
                      }
                    >
                      <SelectTrigger id="p-intent" className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vender">Vender</SelectItem>
                        <SelectItem value="arrendar">Arrendar</SelectItem>
                      </SelectContent>
                    </Select>
                  </ClientOnly>
                </div>
                <div>
                  <Label htmlFor="p-type">Tipo de inmueble</Label>
                  <ClientOnly
                    fallback={
                      <div
                        className="mt-1.5 flex h-9 items-center rounded-md border border-border px-3 text-sm text-muted-foreground"
                        aria-hidden="true"
                      >
                        Apartamento
                      </div>
                    }
                  >
                    <Select
                      value={form.propertyType}
                      onValueChange={(v) => setForm((f) => ({ ...f, propertyType: v }))}
                    >
                      <SelectTrigger id="p-type" className="mt-1.5 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["apartamento", "casa", "oficina", "local", "lote", "bodega"].map(
                          (t) => (
                            <SelectItem key={t} value={t} className="capitalize">
                              {t}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </ClientOnly>
                </div>
              </div>

              <div>
                <Label htmlFor="p-city">Ciudad / zona *</Label>
                <Input
                  id="p-city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="mt-1.5"
                  placeholder="Bogotá, Chía, Cajicá…"
                  aria-invalid={!!errors.city}
                  aria-describedby={errors.city ? "p-city-error" : undefined}
                  aria-required="true"
                />
                {errors.city && (
                  <p id="p-city-error" className="mt-1 text-xs text-destructive">
                    {errors.city}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="p-message">Detalles (opcional)</Label>
                <Textarea
                  id="p-message"
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="mt-1.5"
                  placeholder="Área, habitaciones, estrato, precio esperado…"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full rounded-lg"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Enviando…" : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Quiero que me contacten
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}
