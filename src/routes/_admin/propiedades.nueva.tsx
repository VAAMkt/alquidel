import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { PropertyForm } from "@/components/admin/PropertyForm";

export const Route = createFileRoute("/_admin/propiedades/nueva")({
  component: NuevaPropiedadPage,
});

function NuevaPropiedadPage() {
  return (
    <div>
      <Link to="/admin/propiedades" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="mr-1 h-4 w-4" /> Volver al listado
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Nueva propiedad</h1>
      <p className="mt-1 text-sm text-muted-foreground">Completa la información para publicar una nueva propiedad.</p>
      <div className="mt-8">
        <PropertyForm mode="create" />
      </div>
    </div>
  );
}
