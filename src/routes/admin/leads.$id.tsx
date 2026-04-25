import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Mail,
  MessageCircle,
  Phone,
  Save,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
  type LeadSource,
  SourceBadge,
  StatusBadge,
  whatsappLink,
} from "@/lib/leads";

export const Route = createFileRoute("/admin/leads/$id")({
  head: () => ({
    meta: [{ title: "Detalle de lead · ALQUIDEL" }],
  }),
  component: LeadDetailPage,
});

function LeadDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [noteDraft, setNoteDraft] = useState("");

  const { data: lead, isLoading } = useQuery({
    queryKey: ["admin", "lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "*, properties:property_id(id, slug, title, city, neighborhood, price)",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: agents } = useQuery({
    queryKey: ["admin", "agents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "lead", id] });
    queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
  };

  const statusMutation = useMutation({
    mutationFn: async (status: LeadStatus) => {
      const { error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estado actualizado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignMutation = useMutation({
    mutationFn: async (agentId: string | null) => {
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: agentId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asignación actualizada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const noteMutation = useMutation({
    mutationFn: async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) throw new Error("La nota está vacía");
      const stamp = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
      const previous = lead?.notes ?? "";
      const newEntry = `[${stamp}] ${trimmed}`;
      const next = previous ? `${newEntry}\n---\n${previous}` : newEntry;
      const { error } = await supabase
        .from("leads")
        .update({ notes: next })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nota guardada");
      setNoteDraft("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando…</div>;
  }
  if (!lead) {
    return (
      <div className="text-sm text-muted-foreground">
        Lead no encontrado.{" "}
        <Link to="/admin/leads" className="text-accent underline">
          Volver
        </Link>
      </div>
    );
  }

  const property = (lead as any).properties as
    | { id: string; slug: string; title: string; city: string; neighborhood: string | null; price: number }
    | null;

  const noteHistory = (lead.notes ?? "")
    .split("\n---\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate({ to: "/admin/leads" })}
        className="mb-4 -ml-2"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Volver a leads
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {lead.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status as LeadStatus} />
            <SourceBadge source={lead.source as LeadSource} />
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(lead.created_at), "dd 'de' MMMM yyyy 'a las' HH:mm", {
                locale: es,
              })}
            </span>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex gap-2">
          {lead.phone && (
            <>
              <Button asChild variant="outline" size="sm">
                <a href={`tel:${lead.phone}`}>
                  <Phone className="mr-1.5 h-4 w-4" /> Llamar
                </a>
              </Button>
              <Button asChild size="sm" className="bg-green-600 text-white hover:bg-green-700">
                <a href={whatsappLink(lead.phone)} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
                </a>
              </Button>
            </>
          )}
          <Button asChild variant="outline" size="sm">
            <a href={`mailto:${lead.email}`}>
              <Mail className="mr-1.5 h-4 w-4" /> Email
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Columna izquierda */}
        <div className="space-y-4">
          <Card className="border-border p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <User className="h-4 w-4" />
              Información del contacto
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Nombre</dt>
                <dd className="font-medium text-foreground">{lead.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd>
                  <a
                    href={`mailto:${lead.email}`}
                    className="font-medium text-foreground hover:text-accent"
                  >
                    {lead.email}
                  </a>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Teléfono</dt>
                <dd>
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="font-medium text-foreground hover:text-accent"
                    >
                      {lead.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </Card>

          {property && (
            <Card className="border-border p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Building2 className="h-4 w-4" />
                Propiedad de interés
              </h2>
              <Link
                to="/propiedades/$slug"
                params={{ slug: property.slug }}
                target="_blank"
                className="mt-4 block rounded-md border border-border p-4 transition-colors hover:border-accent"
              >
                <p className="font-medium text-foreground">{property.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[property.neighborhood, property.city].filter(Boolean).join(" · ")}
                </p>
              </Link>
            </Card>
          )}

          <Card className="border-border p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Mensaje
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
              {lead.message || (
                <span className="italic text-muted-foreground">Sin mensaje.</span>
              )}
            </p>
          </Card>
        </div>

        {/* Columna derecha — gestión */}
        <div className="space-y-4">
          <Card className="border-border p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Gestión
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-xs">Estado</Label>
                <Select
                  value={lead.status}
                  onValueChange={(v) => statusMutation.mutate(v as LeadStatus)}
                  disabled={statusMutation.isPending}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {LEAD_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Agente asignado</Label>
                <Select
                  value={lead.assigned_to ?? "none"}
                  onValueChange={(v) =>
                    assignMutation.mutate(v === "none" ? null : v)
                  }
                  disabled={assignMutation.isPending}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {agents?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.full_name || "Sin nombre"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="border-border p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Notas internas
            </h2>
            <div className="mt-4 space-y-2">
              <Textarea
                placeholder="Añadir nota interna…"
                rows={3}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => noteMutation.mutate(noteDraft)}
                  disabled={!noteDraft.trim() || noteMutation.isPending}
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  Guardar nota
                </Button>
              </div>
            </div>

            {noteHistory.length > 0 && (
              <div className="mt-6 space-y-3 border-t border-border pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Historial
                </p>
                {noteHistory.map((entry, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-border bg-secondary/30 p-3 text-sm text-foreground"
                  >
                    <p className="whitespace-pre-wrap">{entry}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
