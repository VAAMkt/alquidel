import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { ArrowRight, Loader2 } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PostCard } from "@/components/public/PostCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  POST_CATEGORIES,
  POST_CATEGORY_LABELS,
  type PostCategory,
} from "@/lib/posts";

const PER_PAGE = 12;

const searchSchema = z.object({
  cat: fallback(
    z.enum(["todos", ...POST_CATEGORIES] as [string, ...string[]]),
    "todos",
  ).default("todos"),
  page: fallback(z.number().int().min(1), 1).default(1),
});

type BlogSearch = z.infer<typeof searchSchema>;

function blogQueryOptions(search: BlogSearch) {
  return queryOptions({
    queryKey: ["blog", "list", search.cat, search.page],
    staleTime: 60_000,
    queryFn: async () => {
      const from = (search.page - 1) * PER_PAGE;
      const to = from + PER_PAGE - 1;
      let q = supabase
        .from("posts")
        .select(
          "id, slug, title, excerpt, cover_image, category, status, author, published_at, tags",
          { count: "exact" },
        )
        .eq("status", "publicado")
        .order("published_at", { ascending: false })
        .range(from, to);
      if (search.cat !== "todos") {
        q = q.eq("category", search.cat as PostCategory);
      }
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });
}

export const Route = createFileRoute("/blog/")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => search,
  // Devolver la misma data que se precarga permite que el cliente la hidrate
  // sin reemplazar el HTML del servidor por el estado de carga.
  loader: async ({ context, deps }) => ({
    posts: await context.queryClient.ensureQueryData(blogQueryOptions(deps as BlogSearch)),
  }),
  head: () => ({
    meta: [
      { title: "Blog inmobiliario — ALQUIDEL" },
      {
        name: "description",
        content:
          "Consejos de compra, tendencias del mercado inmobiliario y guías prácticas para tomar mejores decisiones en Colombia.",
      },
      { property: "og:title", content: "Blog inmobiliario — ALQUIDEL" },
      {
        property: "og:description",
        content:
          "Consejos de compra, tendencias del mercado y guías inmobiliarias en Colombia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://alquidel.com/blog" },
    ],
    links: [{ rel: "canonical", href: "https://alquidel.com/blog" }],
  }),
  errorComponent: BlogLoadError,
  component: BlogPage,
});

function BlogPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { posts: initialData } = Route.useLoaderData();

  const { data, isLoading } = useQuery({
    ...blogQueryOptions(search),
    initialData,
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PER_PAGE));
  const isEmpty = !isLoading && (data?.rows.length ?? 0) === 0;

  function setCat(cat: PostCategory | "todos") {
    navigate({ search: { cat, page: 1 } });
  }

  return (
    <PublicLayout>
      <section className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Blog
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Contenido inmobiliario para tomar mejores decisiones
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Consejos de compra, tendencias del mercado, guías legales y más.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap gap-2">
          <CatChip active={search.cat === "todos"} onClick={() => setCat("todos")}>
            Todos
          </CatChip>
          {POST_CATEGORIES.map((c) => (
            <CatChip key={c} active={search.cat === c} onClick={() => setCat(c)}>
              {POST_CATEGORY_LABELS[c]}
            </CatChip>
          ))}
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data!.rows.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={search.page <= 1}
                  onClick={() => navigate({ search: { cat: search.cat, page: search.page - 1 } })}
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {search.page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={search.page >= totalPages}
                  onClick={() => navigate({ search: { cat: search.cat, page: search.page + 1 } })}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </PublicLayout>
  );
}

function CatChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-20 text-center">
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
        Próximamente
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
        Estamos preparando el primer contenido
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
        Contenido inmobiliario para ayudarte a tomar mejores decisiones. Consejos de
        compra, tendencias del mercado y más.
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link to="/propiedades">
            Ver propiedades disponibles
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function BlogLoadError({ reset }: { reset: () => void }) {
  return (
    <PublicLayout>
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Blog
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          No pudimos cargar el contenido
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground" role="alert">
          Inténtalo nuevamente en unos segundos.
        </p>
        <div className="mt-6 flex gap-3">
          <Button onClick={reset}>Intentar otra vez</Button>
          <Button asChild variant="outline">
            <Link to="/">Ir a casa</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
