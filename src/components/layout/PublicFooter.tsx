import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { whatsappUrl } from "@/lib/whatsapp";
import { trackWhatsApp } from "@/lib/analytics";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <BrandLogo variant="full" tone="color" className="h-20 w-auto" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {COMPANY.about}
            </p>
            <div className="mt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Síguenos
              </h4>
              <div className="mt-2 flex gap-2">
                <a
                  href={COMPANY.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook de Alquidel"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  href={COMPANY.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram de Alquidel"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">Navegación</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/propiedades" className="hover:text-foreground">Propiedades</Link></li>
              <li><Link to="/propietarios" className="hover:text-foreground">Propietarios</Link></li>
              <li><Link to="/nosotros" className="hover:text-foreground">Nosotros</Link></li>
              <li><Link to="/contacto" className="hover:text-foreground">Contacto</Link></li>
              <li><Link to="/login" className="hover:text-foreground">Acceso asesores</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">Operaciones</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Venta de inmuebles</li>
              <li>Arriendo residencial</li>
              <li>Arriendo comercial</li>
              <li>Asesoría personalizada</li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">Contacto</h4>
            <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{COMPANY.address}</span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-0.5">
                  <a href={COMPANY.phoneHref} className="block hover:text-foreground">{COMPANY.phone}</a>
                  <a href={COMPANY.pbxHref} className="block hover:text-foreground">PBX {COMPANY.pbx}</a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <a href={COMPANY.emailHref} className="hover:text-foreground">{COMPANY.email}</a>
              </li>
              <li className="flex items-start gap-2">
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <a
                  href={whatsappUrl()}
                  onClick={() => trackWhatsApp("footer")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  Escríbenos por WhatsApp
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {COMPANY.name}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}