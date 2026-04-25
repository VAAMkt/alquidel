import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="group inline-flex items-baseline gap-1">
          <span className="text-xl font-semibold tracking-[0.2em] text-foreground">
            ALQUIDEL
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent transition-transform group-hover:scale-125" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            to="/propiedades"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Propiedades
          </Link>
          <Link
            to="/blog"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Blog
          </Link>
          <Link
            to="/contacto"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground" }}
          >
            Contacto
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
            Acceder
          </Link>
          <Button asChild size="sm" className="rounded-lg">
            <Link to="/propiedades">Ver propiedades</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}