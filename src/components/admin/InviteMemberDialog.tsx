import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteTeamMember } from "@/server/team.functions";

const schema = z.object({
  email: z.string().email("Email inválido").max(320),
  fullName: z.string().trim().min(2, "Nombre mínimo 2 caracteres").max(120),
  role: z.enum(["admin", "agente"]),
});

export function InviteMemberDialog() {
  const qc = useQueryClient();
  const inviteFn = useServerFn(inviteTeamMember);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "agente">("agente");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setEmail(""); setFullName(""); setRole("agente"); setErrors({});
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({ email, fullName, role });
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
        setErrors(errs);
        throw new Error("Revisa los datos");
      }
      setErrors({});
      return await inviteFn({ data: parsed.data });
    },
    onSuccess: () => {
      toast.success(`Invitación enviada a ${email}`);
      qc.invalidateQueries({ queryKey: ["admin", "team"] });
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
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invitar miembro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invitar nuevo miembro</DialogTitle>
          <DialogDescription>
            Recibirá un email para crear su contraseña y acceder al panel.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Nombre completo *</Label>
            <Input id="invite-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email *</Label>
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "agente")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agente">Agente — gestión diaria de leads y propiedades</SelectItem>
                <SelectItem value="admin">Admin — acceso total + gestión de equipo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar invitación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}