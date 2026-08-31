import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  LEAD_SOURCES,
  LEAD_SOURCE_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type LeadSource,
  type LeadStatus,
} from "@/lib/leads";

const schema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(200),
  email: z.string().trim().email("Email inválido").max(320),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES),
  property_id: z.string().uuid().nullable().optional(),
});

export function NewLeadDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [source, setSource] = useState<LeadSource>("manual");
  const [status, setStatus] = useState<LeadStatus>("nuevo");
  const [propertyId, setPropertyId] = useState<string>("none");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: properties } = useQuery({
    queryKey: ["admin", "properties", "select-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, title, city")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
    staleTime: 60_000,
  });

  const reset = () => {
    setName(""); setEmail(""); setPhone(""); setMessage("");
    setSource("manual"); setStatus("nuevo"); setPropertyId("none");
    setErrors({});
  };

  const create = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({
        name, email, phone, message,
        source, status,
        property_id: propertyId === "none" ? null : propertyId,
      });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        parsed.error.issues.forEach((i) => {
          errs[i.path[0] as string] = i.message;
        });
        setErrors(errs);
        throw new Error("Revisa los datos");
      }
      setErrors({});
      const payload = {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        message: parsed.data.message || "",
        source: parsed.data.source,
        status: parsed.data.status,
        property_id: parsed.data.property_id ?? null,
      };
      const { error } = await supabase.from("leads").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead creado");
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
      reset();
      setOpen(false);
    },
    onError: (e: Error) => {
      if (e.message !== "Revisa los datos") toast.error(e.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="rounded-lg">
          <Plus className="mr-2 h-4 w-4" />
          Nuevo lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar lead manual</DialogTitle>
          <DialogDescription>
            Captura un contacto recibido por llamada, walk-in, referido u otro canal.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">Nombre *</Label>
            <Input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Email *</Label>
              <Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-phone">Teléfono</Label>
              <Input id="lead-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Fuente</Label>
              <Select value={source} onValueChange={(v) => setSource(v as LeadSource)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>{LEAD_SOURCE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{LEAD_STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Propiedad de interés (opcional)</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
              <SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin propiedad asociada</SelectItem>
                {(properties ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title} · {p.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-message">Mensaje / notas</Label>
            <Textarea
              id="lead-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Comentario, intención, presupuesto…"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}