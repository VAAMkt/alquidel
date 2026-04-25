import { Link } from "@tanstack/react-router";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="inline-flex items-baseline gap-1">
              <span className="text-lg font-semibold tracking-[0.2em] text-foreground">
                ALQUIDEL
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Inmobiliaria premium en Bogotá. Venta y arriendo de propiedades
              seleccionadas.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Navegación</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/propiedades" className="hover:text-foreground">Propiedades</Link></li>
              <li><Link to="/blog" className="hover:text-foreground">Blog</Link></li>
              <li><Link to="/contacto" className="hover:text-foreground">Contacto</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Operaciones</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Venta de inmuebles</li>
              <li>Arriendo residencial</li>
              <li>Arriendo comercial</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Contacto</h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Bogotá, Colombia</li>
              <li>contacto@alquidel.co</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} ALQUIDEL. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}