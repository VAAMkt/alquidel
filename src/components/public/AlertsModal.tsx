import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const CITIES = [
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Bucaramanga",
  "Pereira",
  "Manizales",
] as const;

const schema = z.object({
  email: z.string().trim().email("Email inválido").max(320),
  city: z.string().nullable(),
  type: z.enum(["venta", "arriendo"]).nullable(),
  max_price: z.number().int().nonnegative().nullable(),
});

export function AlertsModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [city, setCity] = useState<string>("any");
  const [type, setType] = useState<string>("any");
  const [maxPrice, setMaxPrice] = useState<string>("");

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = schema.parse({
        email,
        city: city === "any" ? null : city,
        type: type === "any" ? null : (type as "venta" | "arriendo"),
        max_price: maxPrice ? Number(maxPrice) : null,
      });
      const { error } = await supabase.from("property_alerts").insert(parsed);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("¡Listo! Te notificaremos por email cuando publiquemos algo nuevo.");
      setEmail("");
      setCity("any");
      setType("any");
      setMaxPrice("");
      setOpen(false);
    },
    onError: (e: any) => {
      const msg =
        e?.issues?.[0]?.message ?? e?.message ?? "No pudimos registrar tu alerta";
      toast.error(msg);
    },
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="lg" className="bg-slate-800 hover:bg-slate-900">
          <Bell className="mr-2 h-4 w-4" />
          Crear alerta
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Alertas de nuevas propiedades</SheetTitle>
          <SheetDescription>
            Te notificaremos por email cuando publiquemos propiedades que coincidan
            con tus criterios.
          </SheetDescription>
        </SheetHeader>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div>
            <Label htmlFor="alert-email">Email *</Label>
            <Input
              id="alert-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              maxLength={320}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Ciudad</Label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Cualquier ciudad</SelectItem>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Operación</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Cualquiera</SelectItem>
                <SelectItem value="venta">Venta</SelectItem>
                <SelectItem value="arriendo">Arriendo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="alert-max-price">Presupuesto máximo (COP)</Label>
            <Input
              id="alert-max-price"
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Opcional"
              className="mt-1.5"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Te notificaremos por email cuando publiquemos propiedades que coincidan.
          </p>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-slate-800 hover:bg-slate-900"
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Activar alerta
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}