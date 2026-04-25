import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, Download, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatCOP } from "@/lib/format";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  venta: "Venta",
  arriendo: "Arriendo",
};

export const Route = createFileRoute("/admin/alertas")({
  head: () => ({ meta: [{ title: "Alertas · ALQUIDEL" }] }),
  component: AlertasPage,
});

function AlertasPage() {
  const [cityFilter, setCityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("todos");

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["admin", "property_alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_alerts")
        .select("id, email, city, type, max_price, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  const filtered = useMemo(() => {
    if (!alerts) return [];
    return alerts.filter((a) => {
      if (cityFilter.trim()) {
        const c = (a.city ?? "").toLowerCase();
        if (!c.includes(cityFilter.trim().toLowerCase())) return false;
      }
      if (typeFilter !== "todos" && a.type !== typeFilter) return false;
      return true;
    });
  }, [alerts, cityFilter, typeFilter]);

  const handleExport = () => {
    if (!filtered.length) {
      toast.info("No hay alertas para exportar");
      return;
    }
    const headers = ["Email", "Ciudad", "Tipo", "Presupuesto máx (COP)", "Fecha"];
    const rows = filtered.map((a) => [
      a.email,
      a.city ?? "",
      a.type ? TYPE_LABELS[a.type] ?? a.type : "",
      a.max_price ? String(a.max_price) : "",
      format(new Date(a.created_at), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((cell) => {
            const v = String(cell ?? "");
            return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alertas-${format(new Date(), "yyyyMMdd-HHmm")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} alertas exportadas`);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Bell className="h-6 w-6 text-accent" />
            Alertas de propiedades
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personas suscritas para recibir avisos cuando aparezcan propiedades nuevas.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Métrica */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {alerts?.length ?? 0}
          </p>
        </Card>
        <Card className="border-border p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Mostrando</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{filtered.length}</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filtrar por ciudad…"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="w-[220px]"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Operación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas las operaciones</SelectItem>
            <SelectItem value="venta">Venta</SelectItem>
            <SelectItem value="arriendo">Arriendo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <Card className="mt-4 overflow-x-auto border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead className="text-right">Presupuesto máx</TableHead>
              <TableHead>Recibida</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  Cargando alertas…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center">
                  <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">No hay alertas</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cuando alguien se suscriba desde el catálogo aparecerá aquí.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <a
                      href={`mailto:${a.email}`}
                      className="text-sm text-foreground hover:text-accent hover:underline"
                    >
                      {a.email}
                    </a>
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.city || <span className="text-xs text-muted-foreground">Cualquiera</span>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.type ? (
                      <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
                        {TYPE_LABELS[a.type] ?? a.type}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Cualquiera</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {a.max_price ? (
                      formatCOP(Number(a.max_price))
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin límite</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(a.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}