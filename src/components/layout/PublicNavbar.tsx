import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { whatsappUrl } from "@/lib/whatsapp";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/hooks/useAuth";
import { BrandLogo } from "@/components/brand/BrandLogo";

const NAV = [
  { to: "/propiedades", label: "Propiedades" },
  { to: "/blog", label: "Blog" },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/contacto", label: "Contacto" },
] as const;

export function PublicNavbar() {
  const { count: favCount } = useFavorites();
  const { session } = useAuth();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Inicio Alquidel" className="inline-flex items-center">
          <BrandLogo variant="full" tone="color" className="h-9 w-auto" />
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
          {favCount > 0 && (
            <Link
              to="/favoritos"
              aria-label="Mis favoritos"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Heart className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {favCount}
              </span>
            </Link>
          )}
          {session ? (
            <Link
              to="/admin/dashboard"
              className="hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Ir al panel
            </Link>
          ) : (
            <Link
              to="/login"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Acceder
            </Link>
          )}
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