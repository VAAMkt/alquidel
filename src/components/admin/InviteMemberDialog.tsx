import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toast } from "sonner";
import { UserPlus, Loader2, Eye, EyeOff, Sparkles, Copy } from "lucide-react";
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
import { createTeamMember } from "@/lib/team.functions";

const schema = z.object({
  email: z.string().email("Email inválido").max(320),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
  fullName: z.string().trim().min(2, "Nombre mínimo 2 caracteres").max(120),
  phone: z.string().trim().max(40).optional(),
  role: z.enum(["admin", "agente"]),
});

function generatePassword(length = 14): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < length; i++) out += charset[arr[i] % charset.length];
  return out;
}

export function InviteMemberDialog() {
  const qc = useQueryClient();
  const createFn = useServerFn(createTeamMember);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"admin" | "agente">("agente");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setFullName("");
    setPhone("");
    setRole("agente");
    setErrors({});
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({
        email,
        password,
        fullName,
        phone: phone.trim() ? phone.trim() : undefined,
        role,
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
      return await createFn({ data: parsed.data });
    },
    onSuccess: () => {
      toast.success(`Miembro creado. Comparte la contraseña con ${email} de forma segura.`, {
        duration: 6000,
      });
      qc.invalidateQueries({ queryKey: ["admin", "team"] });
      reset();
      setOpen(false);
    },
    onError: (e: Error) => {
      if (e.message !== "Revisa los datos") toast.error(e.message);
    },
  });

  const handleGenerate = () => {
    const pwd = generatePassword(14);
    setPassword(pwd);
    setShowPassword(true);
    toast.message("Contraseña generada", {
      description: "Cópiala antes de cerrar el diálogo.",
    });
  };

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Contraseña copiada al portapapeles");
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Crear miembro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear nuevo miembro</DialogTitle>
          <DialogDescription>
            El miembro podrá acceder de inmediato con el email y contraseña que definas. Compártele
            estos datos por un canal seguro (WhatsApp, llamada, etc.).
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Nombre completo *</Label>
            <Input
              id="invite-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email *</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-phone">Teléfono</Label>
            <Input
              id="invite-phone"
              type="tel"
              placeholder="+57 300 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="invite-password">Contraseña *</Label>
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
              >
                <Sparkles className="h-3 w-3" /> Generar segura
              </button>
            </div>
            <div className="relative">
              <Input
                id="invite-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-20"
                autoComplete="new-password"
              />
              <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
                {password && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleCopy}
                    aria-label="Copiar contraseña"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Ocultar" : "Mostrar"}
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "admin" | "agente")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agente">
                  Agente — gestión diaria de leads y propiedades
                </SelectItem>
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
              Crear miembro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
