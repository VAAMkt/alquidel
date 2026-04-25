import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Users, Star, Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_admin/dashboard")({
  component: DashboardPage,
});

function StatCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof Building2 }) {
  return (
    <Card className="rounded-lg border-border p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
    </Card>
  );
}

function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: async () => {
      const [props, featured, leads, newLeads] = await Promise.all([
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("status", "disponible"),
        supabase.from("properties").select("*", { count: "exact", head: true }).eq("is_featured", true),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "nuevo"),
      ]);
      return {
        propsCount: props.count ?? 0,
        featuredCount: featured.count ?? 0,
        leadsCount: leads.count ?? 0,
        newLeadsCount: newLeads.count ?? 0,
      };
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Resumen de actividad de ALQUIDEL.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Propiedades disponibles" value={stats?.propsCount ?? "—"} icon={Building2} />
        <StatCard label="Destacadas" value={stats?.featuredCount ?? "—"} icon={Star} />
        <StatCard label="Leads totales" value={stats?.leadsCount ?? "—"} icon={Users} />
        <StatCard label="Leads nuevos" value={stats?.newLeadsCount ?? "—"} icon={Inbox} />
      </div>
    </div>
  );
}