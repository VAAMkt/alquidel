import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Placeholder consistente para propiedades sin imagen.
 * Usado en PropertyCard, detalle, comparador y favoritos.
 */
export function PropertyImagePlaceholder({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50 text-muted-foreground",
        className,
      )}
      aria-hidden
    >
      <Building2 className={cn("h-12 w-12 opacity-60", iconClassName)} />
    </div>
  );
}
