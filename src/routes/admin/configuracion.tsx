import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  full_name: z.string().trim().min(2, "Nombre mínimo 2 caracteres").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

async function fetchAgent(userId: string, email: string) {
  const { data, error } = await supabase.from("agents").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return { agent: data, email };
}

export const Route = createFileRoute("/admin/configuracion")({
  component: ConfiguracionPage,
});

function ConfiguracionPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "agent", "me", userId],
    enabled: !!userId,
    queryFn: () => fetchAgent(userId!, user?.email ?? ""),
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data?.agent) {
      setFullName(data.agent.full_name ?? "");
      setPhone(data.agent.phone ?? "");
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      if (!data?.agent) throw new Error("No agent");
      const { error } = await supabase
        .from("agents")
        .update({
          full_name: values.full_name,
          phone: values.phone || null,
        })
        .eq("id", data.agent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil actualizado");
      qc.invalidateQueries({ queryKey: ["admin", "agent", "me"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al guardar"),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ full_name: fullName, phone });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Actualiza la información de tu perfil de agente.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" value={data?.email ?? ""} disabled />
            <p className="text-xs text-muted-foreground">
              El correo no se puede modificar desde aquí.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nombre completo</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej: Juan Pérez"
            />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 3001234567"
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
