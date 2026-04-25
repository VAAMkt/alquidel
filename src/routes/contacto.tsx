import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { COMPANY } from "@/lib/company";
import { whatsappUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/contacto")({
  head: () => ({
    meta: [
      { title: `Contacto | ${COMPANY.name}` },
      {
        name: "description",
        content: `Contáctanos en ${COMPANY.address}. Teléfono ${COMPANY.phone} · ${COMPANY.email}. Atención inmobiliaria personalizada en Bogotá y Colombia.`,
      },
      { property: "og:title", content: `Contacto | ${COMPANY.shortName}` },
      {
        property: "og:description",
        content: "Estamos disponibles para asesorarte. Contáctanos por teléfono, email o WhatsApp.",
      },
    ],
  }),
  component: ContactoPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Tu nombre es requerido").max(200),
  email: z.string().trim().email("Email inválido").max(320),
  phone: z.string().trim().max(50).optional(),
  message: z.string().trim().min(5, "Cuéntanos un poco más").max(2000),
});

function ContactoPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
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
      const { error } = await supabase.from("leads").insert({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        message: parsed.data.message,
        source: "formulario",
        status: "nuevo",
        property_id: null,
      });
      if (error) {
        console.error("[contacto] Error guardando lead:", error);
        throw new Error(
          error.message ||
            "No pudimos enviar tu mensaje. Intenta de nuevo o escríbenos por WhatsApp.",
        );
      }
    },
    onSuccess: () => {
      toast.success("¡Gracias! Te contactaremos pronto.");
      setForm({ name: "", email: "", phone: "", message: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <PublicLayout>
      <section className="border-b border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">Contacto</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Hablemos de tu próxima propiedad
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Estamos disponibles para resolver tus dudas y acompañarte en cada paso.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* DATOS */}
          <div className="space-y-4">
            <Card className="rounded-xl border-border p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-accent/10 p-2 text-accent">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dirección</p>
                  <p className="mt-1 text-base font-medium text-foreground">{COMPANY.address}</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border-border p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-accent/10 p-2 text-accent">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teléfonos</p>
                  <a href={COMPANY.phoneHref} className="mt-1 block text-base font-medium text-foreground hover:text-accent">
                    {COMPANY.phone}
                  </a>
                  <a href={COMPANY.pbxHref} className="mt-0.5 block text-sm text-muted-foreground hover:text-foreground">
                    PBX {COMPANY.pbx}
                  </a>
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border-border p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-accent/10 p-2 text-accent">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
                  <a href={COMPANY.emailHref} className="mt-1 block text-base font-medium text-foreground hover:text-accent">
                    {COMPANY.email}
                  </a>
                </div>
              </div>
            </Card>

            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <MessageCircle className="h-5 w-5" />
              Escríbenos por WhatsApp
            </a>
          </div>

          {/* FORMULARIO */}
          <Card className="rounded-xl border-border p-6 sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Envíanos un mensaje
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Completa el formulario y un asesor se pondrá en contacto contigo.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
              className="mt-6 space-y-4"
            >
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1.5"
                />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="mt-1.5"
                  />
                  {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="message">Mensaje *</Label>
                <Textarea
                  id="message"
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="mt-1.5"
                  placeholder="¿En qué podemos ayudarte?"
                />
                {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message}</p>}
              </div>
              <Button type="submit" size="lg" className="w-full rounded-lg" disabled={mutation.isPending}>
                {mutation.isPending ? "Enviando…" : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar mensaje
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
