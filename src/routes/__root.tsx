import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { CompareProvider } from "@/contexts/CompareContext";
import { installServerFnAuthFetch } from "@/integrations/supabase/server-fn-fetch";

import appCss from "../styles.css?url";
import logoFull from "@/assets/alquidel-logo.png.asset.json";

// Install the fetch interceptor as soon as this module loads in the browser
// so that every server-fn call carries the current Supabase JWT.
installServerFnAuthFetch();

interface RouterContext {
  queryClient: QueryClient;
}

function NotFoundComponent() {
  return (
    <PublicLayout>
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Esta página no existe
        </h1>
        <p className="mt-4 max-w-md text-base text-muted-foreground">
          Puede que la propiedad fue retirada o la URL cambió.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
          <Link
            to="/propiedades"
            className="inline-flex h-11 items-center justify-center rounded-md border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Ver propiedades
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ALQUIDEL — Encuentra la propiedad de tus sueños" },
      {
        name: "description",
        content:
          "Venta y arriendo de propiedades premium en Bogotá. Apartamentos, casas, oficinas y locales seleccionados.",
      },
      { name: "author", content: "ALQUIDEL" },
      { property: "og:title", content: "ALQUIDEL — Encuentra la propiedad de tus sueños" },
      {
        property: "og:description",
        content: "Venta y arriendo de propiedades premium en Bogotá.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@alquidel" },
      { name: "twitter:title", content: "ALQUIDEL — Encuentra la propiedad de tus sueños" },
      { name: "description", content: "Venta y arriendo de inmuebles premium. Bogotá y principales ciudades." },
      { property: "og:description", content: "Venta y arriendo de inmuebles premium. Bogotá y principales ciudades." },
      { name: "twitter:description", content: "Venta y arriendo de inmuebles premium. Bogotá y principales ciudades." },
      { property: "og:image", content: logoFull.url },
      { name: "twitter:image", content: logoFull.url },
      { name: "theme-color", content: "#0E2A47" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: logoFull.url },
      { rel: "apple-touch-icon", href: logoFull.url },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FavoritesProvider>
          <CompareProvider>
            <Outlet />
            <Toaster richColors position="top-right" />
          </CompareProvider>
        </FavoritesProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
