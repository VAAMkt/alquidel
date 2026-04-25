import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Calendar, User } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { PostCard } from "@/components/public/PostCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  POST_CATEGORY_COLORS,
  POST_CATEGORY_LABELS,
  formatPostDate,
  type Post,
} from "@/lib/posts";

async function fetchPost(slug: string) {
  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "publicado")
    .maybeSingle();
  if (error) throw error;
  if (!post) throw notFound();

  const { data: related } = await supabase
    .from("posts")
    .select("*")
    .eq("status", "publicado")
    .eq("category", post.category)
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(3);

  return { post: post as Post, related: (related ?? []) as Post[] };
}

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => fetchPost(params.slug),
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { post } = loaderData;
    const title = post.meta_title || post.title;
    const description = post.meta_description || post.excerpt || "";
    const image = post.cover_image || undefined;
    const meta: Array<Record<string, string>> = [
      { title: `${title} — Blog ALQUIDEL` },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "article:published_time", content: post.published_at ?? "" },
      { property: "article:author", content: post.author },
      { property: "article:section", content: POST_CATEGORY_LABELS[post.category] },
      { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description,
      image: image ? [image] : undefined,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      author: { "@type": "Organization", name: post.author },
      publisher: {
        "@type": "Organization",
        name: "ALQUIDEL",
      },
      articleSection: POST_CATEGORY_LABELS[post.category],
      keywords: post.tags.join(", "),
    };

    return {
      meta,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <PublicLayout>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold">Artículo no encontrado</h1>
        <p className="mt-3 text-muted-foreground">
          Este artículo no existe o aún no está publicado.
        </p>
        <Button asChild className="mt-6">
          <Link to="/blog">Volver al blog</Link>
        </Button>
      </div>
    </PublicLayout>
  ),
  component: PostPage,
});

function PostPage() {
  const { post, related } = Route.useLoaderData() as {
    post: Post;
    related: Post[];
  };

  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <Link
          to="/blog"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Volver al blog
        </Link>

        <span
          className={`mt-6 inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${POST_CATEGORY_COLORS[post.category]}`}
        >
          {POST_CATEGORY_LABELS[post.category]}
        </span>

        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" /> {post.author}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" /> {formatPostDate(post.published_at)}
          </span>
        </div>

        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.title}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
          />
        )}

        <div className="prose prose-neutral mt-10 max-w-none prose-headings:tracking-tight prose-a:text-primary">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        {post.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-border bg-muted/40 p-8 text-center">
          <h3 className="text-xl font-semibold tracking-tight">
            ¿Buscas propiedad en Colombia?
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Explora nuestro catálogo de apartamentos, casas y oficinas seleccionadas.
          </p>
          <Button asChild className="mt-5">
            <Link to="/propiedades">
              Ver catálogo
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-tight">Artículos relacionados</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </PublicLayout>
  );
}