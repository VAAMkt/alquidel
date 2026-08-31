import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PostForm } from "@/components/admin/PostForm";
import { supabase } from "@/integrations/supabase/client";
import type { Post } from "@/lib/posts";

export const Route = createFileRoute("/admin/blog/$id/editar")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return { post: data as Post };
  },
  component: EditPostPage,
});

function EditPostPage() {
  const { post } = Route.useLoaderData();
  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al blog
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Editar artículo</h1>
      </div>
      <PostForm mode="edit" initial={post} />
    </div>
  );
}