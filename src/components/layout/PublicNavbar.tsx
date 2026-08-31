import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, MessageCircle, LayoutDashboard, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { whatsappUrl } from "@/lib/whatsapp";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useAuth } from "@/hooks/useAuth";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { CITY_LANDINGS } from "@/lib/landings";

const NAV = [
  { to: "/propiedades", label: "Propiedades" },
  { to: "/propietarios", label: "Propietarios" },
  { to: "/blog", label: "Blog" },
  { to: "/nosotros", label: "Nosotros" },
  { to: "/contacto", label: "Contacto" },
] as const;

export function PublicNavbar() {
  const { count: favCount } = useFavorites();
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="Inicio Alquidel" className="inline-flex items-center">
          <BrandLogo variant="full" tone="color" className="h-16 w-auto" />
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

          {/* Menú móvil */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto">
              <SheetHeader className="text-left">
                <SheetTitle>
                  <BrandLogo variant="full" tone="color" className="h-10 w-auto" />
                </SheetTitle>
              </SheetHeader>

              <nav className="mt-6 flex flex-col gap-1">
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted"
                    activeProps={{ className: "bg-muted text-accent" }}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  to="/favoritos"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-base font-medium text-foreground hover:bg-muted"
                >
                  Favoritos{favCount > 0 ? ` (${favCount})` : ""}
                </Link>
                <Link
                  to={session ? "/admin/dashboard" : "/login"}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-base font-medium text-muted-foreground hover:bg-muted"
                >
                  {session ? "Ir al panel" : "Acceder"}
                </Link>
              </nav>

              <div className="mt-6 border-t border-border pt-5">
                <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Busca por ciudad
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  {CITY_LANDINGS.map((c) => (
                    <div key={c.slug} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                      <span className="font-medium text-foreground">{c.label}</span>
                      <Link
                        to="/arriendos/$ciudad"
                        params={{ ciudad: c.slug }}
                        onClick={() => setOpen(false)}
                        className="text-muted-foreground hover:text-accent"
                      >
                        arriendo
                      </Link>
                      <span className="text-border">·</span>
                      <Link
                        to="/venta/$ciudad"
                        params={{ ciudad: c.slug }}
                        onClick={() => setOpen(false)}
                        className="text-muted-foreground hover:text-accent"
                      >
                        venta
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}