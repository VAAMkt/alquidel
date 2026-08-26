import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, Bell, Eye, Inbox, Building2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bar,
  BarChart,
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
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/analiticas")({
  head: () => ({ meta: [{ title: "Analíticas · ALQUIDEL" }] }),
  component: AnalyticsPage,
});

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
  switch (period) {
    case "hoy":
      return d;
    case "7d":
      d.setDate(d.getDate() - 6);
      return d;
    case "30d":
      d.setDate(d.getDate() - 29);
      return d;
    case "mes":
      d.setDate(1);
      return d;
  }
}

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number | string;
  icon: typeof Eye;
  hint?: string;
}) {
  return (
    <Card className="rounded-lg border-border p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

type ViewRow = {
  property_id: string | null;
  slug: string;
  city: string | null;
  viewed_at: string;
};

type LeadRow = {
  property_id: string | null;
  properties: { slug: string; title: string } | null;
};

function AnalyticsPage() {
  const { session } = useAuth();
  const isReady = !!session?.user;
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const from = periodStart(period).toISOString();

  const { data: views, isLoading: loadingViews } = useQuery({
    queryKey: ["admin", "analytics", "views", period],
    enabled: isReady,
    staleTime: 60_000,
    queryFn: async (): Promise<ViewRow[]> => {
      const { data, error } = await supabase
        .from("property_views")
        .select("property_id, slug, city, viewed_at")
        .gte("viewed_at", from)
        .order("viewed_at", { ascending: true })
        .limit(20000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: titles } = useQuery({
    queryKey: ["admin", "analytics", "property-titles"],
    enabled: isReady,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, slug, title, city");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["admin", "analytics", "counts", period],
    enabled: isReady,
    staleTime: 60_000,
    queryFn: async () => {
      const [leads, alerts] = await Promise.all([
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .gte("created_at", from),
        supabase
          .from("property_alerts")
          .select("*", { count: "exact", head: true })
          .gte("created_at", from),
      ]);
      return { leads: leads.count ?? 0, alerts: alerts.count ?? 0 };
    },
  });

  const { data: leadsByProperty } = useQuery({
    queryKey: ["admin", "analytics", "leads-by-property", period],
    enabled: isReady,
    staleTime: 60_000,
    queryFn: async (): Promise<LeadRow[]> => {
      const { data, error } = await supabase
        .from("leads")
        .select("property_id, properties:property_id(slug, title)")
        .gte("created_at", from)
        .not("property_id", "is", null)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as unknown as LeadRow[];
    },
  });

  const rows = views ?? [];
  const totalViews = rows.length;
  const uniqueProperties = new Set(rows.map((r) => r.property_id ?? r.slug)).size;

  // Vistas por día
  const byDay = new Map<string, number>();
  const cursor = periodStart(period);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (cursor <= today) {
    byDay.set(format(cursor, "yyyy-MM-dd"), 0);
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const r of rows) {
    const key = format(new Date(r.viewed_at), "yyyy-MM-dd");
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  const chartData = Array.from(byDay.entries()).map(([day, vistas]) => ({
    day: format(new Date(`${day}T00:00:00`), "dd/MM", { locale: es }),
    vistas,
  }));

  // Top propiedades vistas
  const titleBySlug = new Map((titles ?? []).map((t) => [t.slug, t]));
  const viewsBySlug = new Map<string, { slug: string; city: string | null; n: number }>();
  for (const r of rows) {
    const cur = viewsBySlug.get(r.slug);
    if (cur) cur.n += 1;
    else viewsBySlug.set(r.slug, { slug: r.slug, city: r.city, n: 1 });
  }
  const topViewed = Array.from(viewsBySlug.values())
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);

  // Leads por propiedad
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Analíticas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Comportamiento real de los visitantes en la web.
          </p>
        </div>
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vistas de propiedades" value={loadingViews ? "—" : totalViews} icon={Eye} />
        <StatCard
          label="Propiedades únicas vistas"
          value={loadingViews ? "—" : uniqueProperties}
          icon={Building2}
        />
        <StatCard label="Leads recibidos" value={counts?.leads ?? "—"} icon={Inbox} />
        <StatCard label="Alertas registradas" value={counts?.alerts ?? "—"} icon={Bell} />
      </div>

      <Card className="mt-8 border-border p-6">
        <div className="mb-4 flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Vistas por día</h2>
        </div>
        {totalViews === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Aún no hay vistas registradas en este período.
          </p>
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={32} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  labelFormatter={(l) => `Día ${l}`}
                  formatter={(v: number) => [v, "Vistas"]}
                />
                <Bar dataKey="vistas" fill="var(--brand-teal, #1AA6B7)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
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
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
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
                    <TableCell colSpan={2} className="py-10 text-center text-sm text-muted-foreground">
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
    </div>
  );
}
