import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  MessageCircle,
  Phone,
  Search,
  Users,
  FileText,
  Smartphone,
  Hand,
} from "lucide-react";
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
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  type LeadStatus,
  type LeadSource,
  SourceBadge,
  StatusBadge,
} from "@/lib/leads";
import { NewLeadDialog } from "@/components/admin/NewLeadDialog";

const PAGE_SIZE = 20;

const searchSchema = z.object({
  status: fallback(
    z.enum(["todos", ...LEAD_STATUSES] as [string, ...string[]]),
    "todos",
  ).default("todos"),
  source: fallback(
    z.enum(["todas", ...LEAD_SOURCES] as [string, ...string[]]),
    "todas",
  ).default("todas"),
  q: fallback(z.string(), "").default(""),
  page: fallback(z.number().int().min(1), 1).default(1),
});

export const Route = createFileRoute("/admin/leads")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [{ title: "Leads · ALQUIDEL" }],
  }),
  component: LeadsListPage,
});

function LeadsListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  // Métrica: leads capturados por Alquibot en los últimos 30 días
  const { data: chatbotMonthCount } = useQuery({
    queryKey: ["admin", "leads", "chatbot-30d"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("source", "chat")
        .gte("created_at", since.toISOString());
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });

  // Conteos por estado (para los tabs)
  const { data: counts } = useQuery({
    queryKey: ["admin", "leads", "counts"],
    queryFn: async () => {
      const result: Record<string, number> = { todos: 0 };
      const totalRes = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });
      result.todos = totalRes.count ?? 0;
      await Promise.all(
        LEAD_STATUSES.map(async (s) => {
          const r = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("status", s);
          result[s] = r.count ?? 0;
        }),
      );
      return result;
    },
    refetchInterval: 30_000,
  });

  // Listado paginado
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "leads", "list", search],
    queryFn: async () => {
      const from = (search.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("leads")
        .select(
          "id, name, email, phone, status, source, message, created_at, property_id, properties:property_id(id, slug, title)",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (search.status !== "todos") {
        query = query.eq("status", search.status as LeadStatus);
      }
      if (search.source !== "todas") {
        query = query.eq("source", search.source as LeadSource);
      }
      if (search.q.trim()) {
        const term = search.q.trim();
        query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const setSearch = (patch: Record<string, any>) =>
    navigate({
      search: (prev: any) => ({
        ...prev,
        ...patch,
        page: typeof patch.page === "number" ? patch.page : 1,
      }),
    });

  const tabs = [
    { key: "todos", label: "Todos" },
    ...LEAD_STATUSES.map((s) => ({ key: s, label: LEAD_STATUS_LABELS[s] })),
  ] as const;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Users className="h-6 w-6 text-accent" />
            Leads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona los contactos generados desde el sitio web.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Card className="flex items-center gap-3 border-border bg-violet-500/5 p-3 pr-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-violet-600">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Alquibot · últimos 30 días
              </p>
              <p className="text-lg font-semibold text-foreground">
                {chatbotMonthCount ?? 0} leads
              </p>
            </div>
          </Card>
          <NewLeadDialog />
        </div>
      </div>

      {/* Cómo llegan los leads */}
      <Card className="mt-6 border-border p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          ¿Cómo llegan los leads?
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ChannelHint icon={FileText} title="Formulario web" desc="Contacto desde /contacto y fichas de propiedad." />
          <ChannelHint icon={MessageCircle} title="Alquibot" desc="Conversaciones del chatbot del sitio." />
          <ChannelHint icon={Smartphone} title="WhatsApp" desc="Clics al botón flotante de WhatsApp." />
          <ChannelHint icon={Hand} title="Manual" desc="Llamadas, walk-ins o referidos registrados aquí." />
        </div>
      </Card>

      {/* Tabs por estado */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-border">
        {tabs.map((t) => {
          const active = search.status === t.key;
          const count = counts?.[t.key] ?? 0;
          return (
            <button
              key={t.key}
              onClick={() => setSearch({ status: t.key })}
              className={
                "relative -mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors " +
                (active
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}
              <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-foreground">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SearchInput value={search.q} onChange={(q) => setSearch({ q })} />
        <Select
          value={search.source}
          onValueChange={(v) => setSearch({ source: v })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Fuente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las fuentes</SelectItem>
            {LEAD_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {LEAD_SOURCE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <Card className="mt-4 overflow-hidden border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contacto</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Propiedad</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Recibido</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  Cargando leads…
                </TableCell>
              </TableRow>
            ) : (data?.rows.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">No hay leads</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cuando alguien envíe un formulario aparecerá aquí.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              data!.rows.map((lead) => {
                const property = (lead as any).properties as
                  | { slug: string; title: string }
                  | null;
                return (
                  <TableRow key={lead.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        to="/admin/leads/$id"
                        params={{ id: lead.id }}
                        className="block"
                      >
                        <div className="font-medium text-foreground">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">{lead.email}</div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="inline-flex items-center gap-1 text-sm text-foreground hover:text-accent"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {lead.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {property ? (
                        <Link
                          to="/propiedades/$slug"
                          params={{ slug: property.slug }}
                          target="_blank"
                          className="text-sm text-foreground hover:text-accent hover:underline"
                        >
                          {property.title}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">General</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <SourceBadge source={lead.source as LeadSource} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status as LeadStatus} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(lead.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/admin/leads/$id" params={{ id: lead.id }}>
                          Ver
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Paginación */}
      {(data?.total ?? 0) > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {search.page} de {totalPages} · {data?.total} leads
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={search.page <= 1}
              onClick={() => setSearch({ page: search.page - 1 })}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={search.page >= totalPages}
              onClick={() => setSearch({ page: search.page + 1 })}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);
  return (
    <div className="relative min-w-[260px] flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Buscar por nombre o email…"
        className="pl-9"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
    </div>
  );
}

function ChannelHint({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof Search;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-background/40 p-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <div className="leading-tight">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
