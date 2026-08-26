import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Inbox, Star, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
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
import {
  SourceBadge,
  StatusBadge,
  type LeadStatus,
  type LeadSource,
} from "@/lib/leads";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · ALQUIDEL" }] }),
  component: DashboardPage,
});

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type LeadWithProperty = LeadRow & {
  properties: { slug: string; title: string } | null;
};

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
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function DashboardPage() {
  const { session } = useAuth();
  const isReady = !!session?.user;

  const { data: stats } = useQuery({
    queryKey: ["admin", "dashboard-stats-v2"],
    enabled: isReady,
    staleTime: 60_000,
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [props, featured, newLeads, monthLeads] = await Promise.all([
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("status", "disponible"),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("is_featured", true).eq("status", "disponible"),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "nuevo"),
        supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
      ]);
      return {
        propsCount: props.count ?? 0,
        featuredCount: featured.count ?? 0,
        newLeadsCount: newLeads.count ?? 0,
        monthLeadsCount: monthLeads.count ?? 0,
      };
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

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Resumen de actividad de ALQUIDEL.
      </p>

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
        <StatCard
          label="Leads este mes"
          value={stats?.monthLeadsCount ?? "—"}
          icon={TrendingUp}
        />
        <StatCard
          label="Destacadas activas"
          value={stats?.featuredCount ?? "—"}
          icon={Star}
        />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Propiedades más vistas esta semana →
        </p>
        <Link to="/admin/analiticas" className="text-sm text-accent hover:underline">
          Ver analíticas completas
        </Link>
      </div>



      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Últimos leads</h2>
          <Link
            to="/admin/leads"
            className="text-sm text-accent hover:underline"
          >
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
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
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
