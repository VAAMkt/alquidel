import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PostForm } from "@/components/admin/PostForm";

export const Route = createFileRoute("/admin/blog/nuevo")({
  component: NuevoPostPage,
});

function NuevoPostPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al blog
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Nuevo artículo</h1>
      </div>
      <PostForm mode="create" />
    </div>
  );
}
