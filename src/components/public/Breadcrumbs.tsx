import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Migas de pan"
      className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
    >
      <Link
        to="/"
        className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        aria-label="Inicio"
      >
        <Home className="h-3 w-3" />
        <span>Inicio</span>
      </Link>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx} className="inline-flex items-center gap-1">
            <ChevronRight className="h-3 w-3 opacity-60" aria-hidden />
            {item.to && !isLast ? (
              <Link to={item.to} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span
                className="line-clamp-1 max-w-[260px] text-foreground"
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
