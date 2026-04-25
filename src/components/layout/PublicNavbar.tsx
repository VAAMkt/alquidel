import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/whatsapp";

const NAV = [
  { to: "/propiedades", label: "Propiedades" },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/contacto", label: "Contacto" },
] as const;

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="group inline-flex items-baseline gap-1">
          <span className="text-xl font-semibold tracking-[0.2em] text-foreground">
            ALQUIDEL
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent transition-transform group-hover:scale-125" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            Acceder
          </Link>
          <Button
            asChild
            size="sm"
            className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contactar por WhatsApp"
            >
              <MessageCircle className="mr-1.5 h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}