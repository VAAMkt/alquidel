import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, UploadCloud, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slugify";
import {
  POST_CATEGORIES, POST_CATEGORY_LABELS, POST_STATUSES, POST_STATUS_LABELS,
  type Post, type PostCategory, type PostStatus,
} from "@/lib/posts";

const schema = z.object({
  title: z.string().trim().min(3, "Título mínimo 3 caracteres").max(200),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  excerpt: z.string().max(500).default(""),
  content: z.string().min(10, "Contenido requerido"),
  cover_image: z.string().optional().or(z.literal("")),
  category: z.enum(POST_CATEGORIES as [PostCategory, ...PostCategory[]]),
  tags: z.array(z.string()),
  status: z.enum(POST_STATUSES as [PostStatus, ...PostStatus[]]),
  meta_title: z.string().max(200).optional().or(z.literal("")),
  meta_description: z.string().max(300).optional().or(z.literal("")),
  author: z.string().min(1).max(120),
});

type Values = z.infer<typeof schema>;

const blank: Values = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image: "",
  category: "consejos",
  tags: [],
  status: "borrador",
  meta_title: "",
  meta_description: "",
  author: "Equipo Alquidel",
};

interface Props {
  initial?: Post;
  mode: "create" | "edit";
}

export function PostForm({ initial, mode }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [v, setV] = useState<Values>(() =>
    initial
      ? {
          title: initial.title,
          slug: initial.slug,
          excerpt: initial.excerpt ?? "",
          content: initial.content ?? "",
          cover_image: initial.cover_image ?? "",
          category: initial.category,
          tags: initial.tags ?? [],
          status: initial.status,
          meta_title: initial.meta_title ?? "",
          meta_description: initial.meta_description ?? "",
          author: initial.author,
        }
      : blank,
  );
  const [tagsText, setTagsText] = useState(initial?.tags?.join(", ") ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  useEffect(() => {
    if (!slugTouched && v.title) {
      setV((s) => ({ ...s, slug: slugify(v.title) }));
    }
  }, [v.title, slugTouched]);

  const mutation = useMutation({
    mutationFn: async (vals: Values) => {
      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        ...vals,
        tags,
        excerpt: vals.excerpt || "",
        cover_image: vals.cover_image || null,
        meta_title: vals.meta_title || null,
        meta_description: vals.meta_description || null,
        published_at:
          vals.status === "publicado"
            ? initial?.published_at ?? new Date().toISOString()
            : initial?.published_at ?? null,
      };
      if (mode === "create") {
        const { error } = await supabase.from("posts").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("posts")
          .update(payload)
          .eq("id", initial!.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(mode === "create" ? "Artículo creado" : "Artículo actualizado");
      qc.invalidateQueries({ queryKey: ["admin", "posts"] });
      navigate({ to: "/admin/blog" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Error al guardar"),
  });

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `posts/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("property-images")
        .upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("property-images").getPublicUrl(path);
      setV((s) => ({ ...s, cover_image: data.publicUrl }));
      toast.success("Imagen subida");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al subir imagen");
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(v);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errs[i.path[0] as string] = i.message;
      });
      setErrors(errs);
      toast.error("Revisa los campos marcados");
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={v.title}
              onChange={(e) => setV({ ...v, title: e.target.value })}
              placeholder="Título del artículo"
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={v.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setV({ ...v, slug: e.target.value });
              }}
              placeholder="mi-articulo"
            />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
          </div>
          <div className="space-y-2">
            <Label>Resumen (excerpt)</Label>
            <Textarea
              rows={2}
              value={v.excerpt}
              onChange={(e) => setV({ ...v, excerpt: e.target.value })}
              placeholder="Resumen breve (150-200 caracteres)"
              maxLength={500}
            />
          </div>
        </Card>

        <Card className="p-6">
          <Tabs defaultValue="edit" className="w-full">
            <div className="mb-4 flex items-center justify-between">
              <Label>Contenido (Markdown)</Label>
              <TabsList>
                <TabsTrigger value="edit">Editar</TabsTrigger>
                <TabsTrigger value="preview">Previsualización</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="edit">
              <Textarea
                rows={20}
                value={v.content}
                onChange={(e) => setV({ ...v, content: e.target.value })}
                placeholder="# Mi artículo&#10;&#10;Escribe aquí tu contenido en Markdown..."
                className="font-mono text-sm"
              />
              {errors.content && (
                <p className="mt-1 text-xs text-destructive">{errors.content}</p>
              )}
            </TabsContent>
            <TabsContent value="preview">
              <div className="prose prose-neutral min-h-[400px] max-w-none rounded-md border border-border p-4">
                {v.content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{v.content}</ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground">Sin contenido aún…</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        <Card className="space-y-4 p-6">
          <h3 className="font-medium">SEO</h3>
          <div className="space-y-2">
            <Label>Meta título</Label>
            <Input
              value={v.meta_title ?? ""}
              onChange={(e) => setV({ ...v, meta_title: e.target.value })}
              placeholder="Si está vacío usa el título"
            />
          </div>
          <div className="space-y-2">
            <Label>Meta descripción</Label>
            <Textarea
              rows={2}
              value={v.meta_description ?? ""}
              onChange={(e) => setV({ ...v, meta_description: e.target.value })}
              placeholder="Si está vacío usa el resumen"
            />
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={v.status}
              onValueChange={(val) => setV({ ...v, status: val as PostStatus })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POST_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{POST_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select
              value={v.category}
              onValueChange={(val) => setV({ ...v, category: val as PostCategory })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {POST_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{POST_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Autor</Label>
            <Input
              value={v.author}
              onChange={(e) => setV({ ...v, author: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Tags (separados por coma)</Label>
            <Input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="bogota, inversion, consejos"
            />
          </div>
        </Card>

        <Card className="space-y-3 p-6">
          <Label>Imagen de portada</Label>
          {v.cover_image ? (
            <div className="relative">
              <img
                src={v.cover_image}
                alt="cover"
                className="aspect-[16/9] w-full rounded-md object-cover"
              />
              <button
                type="button"
                onClick={() => setV({ ...v, cover_image: "" })}
                className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border text-sm text-muted-foreground hover:bg-muted/30"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UploadCloud className="h-5 w-5" />
              )}
              Subir imagen
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadCover(f);
              e.target.value = "";
            }}
          />
          <Input
            value={v.cover_image ?? ""}
            onChange={(e) => setV({ ...v, cover_image: e.target.value })}
            placeholder="o pega una URL"
          />
        </Card>

        <div className="flex flex-col gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Crear artículo" : "Guardar cambios"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/admin/blog" })}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </form>
  );
}