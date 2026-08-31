import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Inbox, Star, TrendingUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { SourceBadge, StatusBadge, type LeadStatus, type LeadSource } from "@/lib/leads";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · ALQUIDEL" }] }),
  component: DashboardPage,
});

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadWithProperty = LeadRow & {
  properties: { slug: string; title: string } | null;
};

type PeriodKey = "hoy" | "7d" | "30d" | "mes";

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "mes", label: "Este mes" },
];

function periodStart(period: PeriodKey): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (period === "7d") d.setDate(d.getDate() - 6);
  if (period === "30d") d.setDate(d.getDate() - 29);
  if (period === "mes") d.setDate(1);
  return d;
}

function formatDuration(ms: number): string {
  if (!ms || !Number.isFinite(ms)) return "—";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number | string;
  icon: typeof Building2;
  hint?: string;
}) {
  return (
    <Card className="rounded-lg border-border p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function Metric({
  label,
  value,
  highlighted,
}: {
  label: string;
  value: string | number;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-5 py-4 ${
        highlighted ? "border border-border bg-card shadow-sm" : ""
      }`}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

type PageViewRow = {
  path: string;
  visitor_id: string;
  session_id: string;
  duration_ms: number | null;
  viewed_at: string;
};

type PropertyViewRow = {
  slug: string;
  city: string | null;
};

type LeadPropRow = {
  properties: { slug: string; title: string } | null;
};

function DashboardPage() {
  const { session } = useAuth();
  const isReady = !!session?.user;
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const from = periodStart(period).toISOString();

  const { data: stats } = useQuery({
    queryKey: ["admin", "dashboard-stats-v2"],
    enabled: isReady,
    staleTime: 60_000,
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [props, featured, newLeads, monthLeads] = await Promise.all([
        supabase
          .from("properties")
          .select("*", { count: "exact", head: true })
          .eq("status", "disponible"),
        supabase
          .from("properties")
          .select("*", { count: "exact", head: true })
          .eq("is_featured", true)
          .eq("status", "disponible"),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "nuevo"),
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .gte("created_at", monthStart.toISOString()),
      ]);
      return {
        propsCount: props.count ?? 0,
        featuredCount: featured.count ?? 0,
        newLeadsCount: newLeads.count ?? 0,
        monthLeadsCount: monthLeads.count ?? 0,
      };
    },
  });

  const { data: pageViews, isLoading: loadingVisits } = useQuery({
    queryKey: ["admin", "dashboard", "page-views", period],
    enabled: isReady,
    staleTime: 60_000,
    queryFn: async (): Promise<PageViewRow[]> => {
      const { data, error } = await supabase
        .from("page_views")
        .select("path, visitor_id, session_id, duration_ms, viewed_at")
        .gte("viewed_at", from)
        .order("viewed_at", { ascending: true })
        .limit(20000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: propertyViews } = useQuery({
    queryKey: ["admin", "dashboard", "property-views", period],
    enabled: isReady,
    staleTime: 60_000,
    queryFn: async (): Promise<PropertyViewRow[]> => {
      const { data, error } = await supabase
        .from("property_views")
        .select("slug, city")
        .gte("viewed_at", from)
        .limit(20000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: titles } = useQuery({
    queryKey: ["admin", "dashboard", "property-titles"],
    enabled: isReady,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, slug, title, city");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: leadsByProperty } = useQuery({
    queryKey: ["admin", "dashboard", "leads-by-property", period],
    enabled: isReady,
    staleTime: 60_000,
    queryFn: async (): Promise<LeadPropRow[]> => {
      const { data, error } = await supabase
        .from("leads")
        .select("property_id, properties:property_id(slug, title)")
        .gte("created_at", from)
        .not("property_id", "is", null)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as unknown as LeadPropRow[];
    },
  });

  const { data: recentLeads } = useQuery({
    queryKey: ["admin", "dashboard-recent-leads"],
    enabled: isReady,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, name, email, status, source, created_at, property_id, properties:property_id(slug, title)",
        )
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  // --- Métricas de visitantes ---
  const views = pageViews ?? [];
  const pageViewCount = views.length;
  const visitors = new Set(views.map((v) => v.visitor_id)).size;
  const sessions = new Map<string, { pages: number; duration: number }>();
  for (const v of views) {
    const cur = sessions.get(v.session_id) ?? { pages: 0, duration: 0 };
    cur.pages += 1;
    cur.duration += v.duration_ms ?? 0;
    sessions.set(v.session_id, cur);
  }
  const sessionCount = sessions.size;
  const viewsPerVisit = sessionCount ? pageViewCount / sessionCount : 0;
  const avgDuration = sessionCount
    ? Array.from(sessions.values()).reduce((a, s) => a + s.duration, 0) / sessionCount
    : 0;
  const bounces = Array.from(sessions.values()).filter((s) => s.pages === 1).length;
  const bounceRate = sessionCount ? Math.round((bounces / sessionCount) * 100) : 0;

  const byDay = new Map<string, Set<string>>();
  const cursor = periodStart(period);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (cursor <= today) {
    byDay.set(format(cursor, "yyyy-MM-dd"), new Set());
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const v of views) {
    const key = format(new Date(v.viewed_at), "yyyy-MM-dd");
    const set = byDay.get(key) ?? new Set<string>();
    set.add(v.visitor_id);
    byDay.set(key, set);
  }
  const chartData = Array.from(byDay.entries()).map(([day, set]) => ({
    day: format(new Date(`${day}T00:00:00`), "dd MMM", { locale: es }),
    visitantes: set.size,
  }));

  // --- Top propiedades vistas ---
  const titleBySlug = new Map((titles ?? []).map((t) => [t.slug, t]));
  const viewsBySlug = new Map<string, { slug: string; city: string | null; n: number }>();
  for (const r of propertyViews ?? []) {
    const cur = viewsBySlug.get(r.slug);
    if (cur) cur.n += 1;
    else viewsBySlug.set(r.slug, { slug: r.slug, city: r.city, n: 1 });
  }
  const topViewed = Array.from(viewsBySlug.values())
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);

  // --- Leads por propiedad ---
  const leadAgg = new Map<string, { slug: string; title: string; n: number }>();
  for (const l of leadsByProperty ?? []) {
    if (!l.properties) continue;
    const key = l.properties.slug;
    const cur = leadAgg.get(key);
    if (cur) cur.n += 1;
    else leadAgg.set(key, { slug: key, title: l.properties.title, n: 1 });
  }
  const topLeads = Array.from(leadAgg.values())
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Resumen de actividad de ALQUIDEL.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Propiedades disponibles"
          value={stats?.propsCount ?? "—"}
          icon={Building2}
        />
        <StatCard
          label="Leads nuevos"
          value={stats?.newLeadsCount ?? "—"}
          icon={Inbox}
          hint="Sin atender"
        />
        <StatCard label="Leads este mes" value={stats?.monthLeadsCount ?? "—"} icon={TrendingUp} />
        <StatCard label="Destacadas activas" value={stats?.featuredCount ?? "—"} icon={Star} />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Visitantes</h2>
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
          <SelectTrigger className="w-[200px]" aria-label="Período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="mt-4 overflow-hidden border-border p-0">
        <div className="grid grid-cols-2 gap-2 border-b border-border bg-muted/30 p-2 sm:grid-cols-3 lg:grid-cols-5">
          <Metric label="Visitantes" value={loadingVisits ? "—" : visitors} highlighted />
          <Metric label="Páginas vistas" value={loadingVisits ? "—" : pageViewCount} />
          <Metric
            label="Vistas por visita"
            value={loadingVisits ? "—" : viewsPerVisit.toFixed(2)}
          />
          <Metric
            label="Duración de visita"
            value={loadingVisits ? "—" : formatDuration(avgDuration)}
          />
          <Metric label="Tasa de rebote" value={loadingVisits ? "—" : `${bounceRate}%`} />
        </div>

        <div className="p-6">
          {pageViewCount === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Aún no hay visitas registradas en este período.
            </p>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand-teal, #1AA6B7)" stopOpacity={0.25} />
                      <stop
                        offset="100%"
                        stopColor="var(--brand-teal, #1AA6B7)"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={32}
                  />
                  <Tooltip
                    labelFormatter={(l) => `${l}`}
                    formatter={(v: number) => [v, "Visitantes"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="visitantes"
                    stroke="var(--brand-teal, #1AA6B7)"
                    strokeWidth={2.5}
                    fill="url(#visitFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </Card>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Top 10 propiedades más vistas
          </h2>
          <Card className="overflow-hidden border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead className="text-right">Vistas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topViewed.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Aún no hay vistas registradas en este período.
                    </TableCell>
                  </TableRow>
                ) : (
                  topViewed.map((row) => (
                    <TableRow key={row.slug}>
                      <TableCell className="text-sm">
                        <Link
                          to="/propiedades/$slug"
                          params={{ slug: row.slug }}
                          className="hover:text-accent hover:underline"
                        >
                          {titleBySlug.get(row.slug)?.title ?? row.slug}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.city ?? titleBySlug.get(row.slug)?.city ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{row.n}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Leads por propiedad</h2>
          <Card className="overflow-hidden border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propiedad</TableHead>
                  <TableHead className="text-right">Leads recibidos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topLeads.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Aún no hay leads asociados a propiedades en este período.
                    </TableCell>
                  </TableRow>
                ) : (
                  topLeads.map((row) => (
                    <TableRow key={row.slug}>
                      <TableCell className="text-sm">
                        <Link
                          to="/propiedades/$slug"
                          params={{ slug: row.slug }}
                          className="hover:text-accent hover:underline"
                        >
                          {row.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{row.n}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Últimos leads</h2>
          <Link to="/admin/leads" className="text-sm text-accent hover:underline">
            Ver todos los leads →
          </Link>
        </div>

        <Card className="overflow-hidden border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contacto</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Recibido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(recentLeads ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Aún no hay leads.
                  </TableCell>
                </TableRow>
              ) : (
                recentLeads!.map((lead) => {
                  const property = (lead as LeadWithProperty).properties;
                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <Link
                          to="/admin/leads/$id"
                          params={{ id: lead.id }}
                          className="block hover:text-accent"
                        >
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-xs text-muted-foreground">{lead.email}</div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {property ? (
                          <span className="text-foreground">{property.title}</span>
                        ) : (
                          <span className="text-muted-foreground">General</span>
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
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
