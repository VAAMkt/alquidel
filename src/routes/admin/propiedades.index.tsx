import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Star,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { displayPrice } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type Property = Database["public"]["Tables"]["properties"]["Row"];
type ListingType = Database["public"]["Enums"]["listing_type"];
type PropertyStatus = Database["public"]["Enums"]["property_status"];

const STATUS_OPTIONS: PropertyStatus[] = ["disponible", "vendido", "arrendado", "reservado"];
const PER_PAGE = 12;

export const Route = createFileRoute("/admin/propiedades/")({
  component: PropiedadesAdmin,
});

const statusBadge: Record<PropertyStatus, string> = {
  disponible: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  vendido: "bg-red-100 text-red-800 hover:bg-red-100",
  arrendado: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  reservado: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
};

function PropiedadesAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | ListingType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | PropertyStatus>("all");
  const [filterCity, setFilterCity] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "properties"],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select(
          "id, title, type, status, price, city, neighborhood, address, images, is_featured, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Property[];
    },
  });

  const cities = useMemo(() => {
    const s = new Set<string>();
    data?.forEach((p) => s.add(p.city));
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((p) => {
      if (filterType !== "all" && p.type !== filterType) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterCity !== "all" && p.city !== filterCity) return false;
      if (q && !`${p.title} ${p.address ?? ""} ${p.neighborhood ?? ""}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [data, search, filterType, filterStatus, filterCity]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const hasActiveFilters =
    search.trim() !== "" || filterType !== "all" || filterStatus !== "all" || filterCity !== "all";

  const clearFilters = () => {
    setSearch("");
    setFilterType("all");
    setFilterStatus("all");
    setFilterCity("all");
    setPage(1);
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Property> }) => {
      const { error } = await supabase.from("properties").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "properties"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (property: Property) => {
      // 1) Borrar imágenes del bucket
      if (property.images?.length) {
        const paths = property.images
          .map((url) => {
            const idx = url.indexOf("/property-images/");
            return idx >= 0 ? url.slice(idx + "/property-images/".length) : null;
          })
          .filter((p): p is string => !!p);
        if (paths.length) {
          await supabase.storage.from("property-images").remove(paths);
        }
      }
      // 2) Borrar registro
      const { error } = await supabase.from("properties").delete().eq("id", property.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Propiedad eliminada");
      qc.invalidateQueries({ queryKey: ["admin", "properties"] });
    },
    onError: (e: Error) => toast.error(`No se pudo eliminar: ${e.message}`),
  });

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Propiedades</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "propiedad" : "propiedades"} en el catálogo
          </p>
        </div>
        <Button asChild className="rounded-lg">
          <Link to="/admin/propiedades/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva propiedad
          </Link>
        </Button>
      </div>

      <Card className="mt-6 rounded-lg border-border p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título o dirección…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={filterType}
            onValueChange={(v) => {
              setFilterType(v as typeof filterType);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Operación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las operaciones</SelectItem>
              <SelectItem value="venta">Venta</SelectItem>
              <SelectItem value="arriendo">Arriendo</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filterStatus}
            onValueChange={(v) => {
              setFilterStatus(v as typeof filterStatus);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterCity}
            onValueChange={(v) => {
              setFilterCity(v);
              setPage(1);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Ciudad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ciudades</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {hasActiveFilters && (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              Mostrando <span className="font-medium text-foreground">{filtered.length}</span> de{" "}
              <span className="font-medium text-foreground">{data?.length ?? 0}</span> propiedades
            </p>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-3.5 w-3.5" />
              Limpiar filtros
            </Button>
          </div>
        )}
      </Card>

      <Card className="mt-4 overflow-hidden rounded-lg border-border p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]"></TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Destacada</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-40">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium text-foreground">
                      {data && data.length > 0
                        ? "Sin resultados con esos filtros"
                        : "Aún no hay propiedades"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {data && data.length > 0
                        ? "Intenta ajustar los filtros."
                        : "Empieza creando tu primera propiedad."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((p) => (
                <TableRow key={p.id} className="group">
                  <TableCell>
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        loading="lazy"
                        decoding="async"
                        className="h-12 w-12 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="truncate font-medium text-foreground">{p.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.neighborhood ?? p.address ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        p.type === "venta"
                          ? "bg-slate-700 text-slate-50 hover:bg-slate-700"
                          : "bg-[color:var(--brand-teal)] text-white hover:bg-[color:var(--brand-teal)]"
                      }
                    >
                      {p.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {displayPrice(p.price)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.city}</TableCell>
                  <TableCell>
                    <Select
                      value={p.status}
                      onValueChange={(v) =>
                        updateMutation.mutate({ id: p.id, patch: { status: v as PropertyStatus } })
                      }
                    >
                      <SelectTrigger className={`h-8 w-[130px] border-0 ${statusBadge[p.status]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() =>
                        updateMutation.mutate({ id: p.id, patch: { is_featured: !p.is_featured } })
                      }
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                      aria-label={p.is_featured ? "Quitar destacada" : "Marcar destacada"}
                    >
                      <Star
                        className={`h-4 w-4 ${p.is_featured ? "fill-[color:var(--brand-teal)] text-[color:var(--brand-teal)]" : "text-muted-foreground"}`}
                      />
                    </button>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("es-CO", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                        <Link to="/admin/propiedades/$id/editar" params={{ id: p.id }}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar propiedad?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción borrará permanentemente{" "}
                              <span className="font-medium text-foreground">{p.title}</span> y todas
                              sus imágenes asociadas. No se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(p)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
