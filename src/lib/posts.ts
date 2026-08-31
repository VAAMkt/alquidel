import type { Database } from "@/integrations/supabase/types";

export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type PostCategory = Database["public"]["Enums"]["post_category"];
export type PostStatus = Database["public"]["Enums"]["post_status"];

export const POST_CATEGORIES: PostCategory[] = [
  "compra",
  "venta",
  "inversion",
  "proyectos",
  "consejos",
  "mercado",
  "legal",
];

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  compra: "Compra",
  venta: "Venta",
  inversion: "Inversión",
  proyectos: "Proyectos de inversión",
  consejos: "Consejos",
  mercado: "Mercado",
  legal: "Legal",
};

export const POST_CATEGORY_COLORS: Record<PostCategory, string> = {
  compra: "bg-blue-100 text-blue-800 border-blue-200",
  venta: "bg-emerald-100 text-emerald-800 border-emerald-200",
  inversion: "bg-violet-100 text-violet-800 border-violet-200",
  proyectos: "bg-teal-100 text-teal-800 border-teal-200",
  consejos: "bg-amber-100 text-amber-800 border-amber-200",
  mercado: "bg-rose-100 text-rose-800 border-rose-200",
  legal: "bg-slate-100 text-slate-800 border-slate-200",
};

export const POST_STATUSES: PostStatus[] = ["borrador", "publicado", "programado"];

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  programado: "Programado",
};

export const POST_STATUS_COLORS: Record<PostStatus, string> = {
  borrador: "bg-slate-100 text-slate-700 border-slate-200",
  publicado: "bg-emerald-100 text-emerald-800 border-emerald-200",
  programado: "bg-amber-100 text-amber-800 border-amber-200",
};

export function formatPostDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
