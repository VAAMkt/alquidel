import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { PropertyForm } from "@/components/admin/PropertyForm";
import { supabase } from "@/integrations/supabase/client";

const propertyQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "property", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

export const Route = createFileRoute("/_admin/propiedades/$id/editar")({
  loader: ({ context: { queryClient }, params: { id } }) =>
    queryClient.ensureQueryData(propertyQuery(id)),
  component: EditarPropiedadPage,
  notFoundComponent: () => (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">Propiedad no encontrada.</p>
      <Link to="/admin/propiedades" className="mt-2 inline-block text-sm text-accent hover:underline">
        Volver al listado
      </Link>
    </div>
  ),
});

function EditarPropiedadPage() {
  const { id } = Route.useParams();
  const { data: property } = useSuspenseQuery(propertyQuery(id));

  return (
    <div>
      <Link to="/admin/propiedades" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="mr-1 h-4 w-4" /> Volver al listado
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Editar propiedad</h1>
      <p className="mt-1 text-sm text-muted-foreground">{property.title}</p>
      <div className="mt-8">
        <PropertyForm mode="edit" initial={property} />
      </div>
    </div>
  );
}
