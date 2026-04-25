import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  POST_CATEGORIES, POST_CATEGORY_LABELS, POST_STATUSES, POST_STATUS_LABELS,
  POST_STATUS_COLORS, POST_CATEGORY_COLORS, formatPostDate,
  type PostCategory, type PostStatus,
} from "@/lib/posts";

const PAGE_SIZE = 20;

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  status: fallback(
    z.enum(["todos", ...POST_STATUSES] as [string, ...string[]]),
    "todos",
  ).default("todos"),
  cat: fallback(
    z.enum(["todos", ...POST_CATEGORIES] as [string, ...string[]]),
    "todos",
  ).default("todos"),
  page: fallback(z.number().int().min(1), 1).default(1),
});

export const Route = createFileRoute("/admin/blog/")({
  validateSearch: zodValidator(searchSchema),
  component: AdminBlogPage,
});

function AdminBlogPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "posts", search],
    queryFn: async () => {
      const from = (search.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("posts")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (search.status !== "todos") q = q.eq("status", search.status as PostStatus);
      if (search.cat !== "todos") q = q.eq("category", search.cat as PostCategory);
      if (search.q) q = q.ilike("title", `%${search.q}%`);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const togglePublish = useMutation({
    mutationFn: async (row: { id: string; status: PostStatus; published_at: string | null }) => {
      const next: PostStatus = row.status === "publicado" ? "borrador" : "publicado";
      const payload: any = { status: next };
      if (next === "publicado" && !row.published_at) {
        payload.published_at = new Date().toISOString();
      }
      const { error } = await supabase.from("posts").update(payload).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === "publicado" ? "Despublicado" : "Publicado");
      qc.invalidateQueries({ queryKey: ["admin", "posts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Artículo eliminado");
      qc.invalidateQueries({ queryKey: ["admin", "posts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error"),
  });

  function setSearch(patch: Record<string, any>) {
    navigate({ search: (prev: any) => ({ ...prev, ...patch, page: patch.page ?? 1 }) });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona los artículos del blog público.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/blog/nuevo">
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo artículo
          </Link>
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Buscar por título…"
            value={search.q}
            onChange={(e) => setSearch({ q: e.target.value })}
            className="max-w-xs"
          />
          <Select value={search.status} onValueChange={(v) => setSearch({ status: v })}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {POST_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{POST_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={search.cat} onValueChange={(v) => setSearch({ cat: v })}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las categorías</SelectItem>
              {POST_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{POST_CATEGORY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (data?.rows.length ?? 0) === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            No hay artículos aún. Crea el primero con el botón de arriba.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Publicado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data!.rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {p.cover_image && (
                        <img
                          src={p.cover_image}
                          alt=""
                          className="h-10 w-14 rounded object-cover"
                        />
                      )}
                      <span className="line-clamp-1">{p.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${POST_CATEGORY_COLORS[p.category]}`}
                    >
                      {POST_CATEGORY_LABELS[p.category]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${POST_STATUS_COLORS[p.status]}`}
                    >
                      {POST_STATUS_LABELS[p.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatPostDate(p.published_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title={p.status === "publicado" ? "Despublicar" : "Publicar"}
                        onClick={() =>
                          togglePublish.mutate({
                            id: p.id,
                            status: p.status,
                            published_at: p.published_at,
                          })
                        }
                      >
                        {p.status === "publicado" ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button asChild size="icon" variant="ghost" title="Editar">
                        <Link to="/admin/blog/$id/editar" params={{ id: p.id }}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" title="Eliminar">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar artículo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. ¿Eliminar “{p.title}”?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate(p.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={search.page <= 1}
            onClick={() => setSearch({ page: search.page - 1 })}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {search.page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={search.page >= totalPages}
            onClick={() => setSearch({ page: search.page + 1 })}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}