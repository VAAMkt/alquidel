// Webhook endpoint for n8n / BlogAut to publish blog posts.
// Auth: Authorization: Bearer <BLOG_WEBHOOK_TOKEN>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

const VALID_CATEGORIES = ["compra", "venta", "inversion", "consejos", "mercado", "legal"];

function slugify(input: string): string {
  return input
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const expected = Deno.env.get("BLOG_WEBHOOK_TOKEN");
  if (!expected) {
    return json({ error: "Webhook not configured" }, 500);
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.replace(/^Bearer\s+/i, "");
  if (!provided || !timingSafeEqual(provided, expected)) {
    return json({ error: "Invalid token" }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content : "";
  if (title.length < 3 || content.length < 10) {
    return json({ error: "title and content are required" }, 400);
  }

  let category = (body.category ?? "consejos") as string;
  if (!VALID_CATEGORIES.includes(category)) category = "consejos";

  const tags: string[] = Array.isArray(body.tags)
    ? body.tags.filter((t: unknown) => typeof t === "string").slice(0, 20)
    : [];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Generate unique slug
  const baseSlug = slugify(title) || `post-${Date.now()}`;
  let slug = baseSlug;
  for (let i = 2; i < 50; i++) {
    const { data: existing } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${i}`;
  }

  const payload = {
    title,
    slug,
    content,
    excerpt: typeof body.excerpt === "string" ? body.excerpt.slice(0, 500) : "",
    cover_image: typeof body.cover_image === "string" ? body.cover_image : null,
    category,
    tags,
    meta_title: typeof body.meta_title === "string" ? body.meta_title : null,
    meta_description: typeof body.meta_description === "string" ? body.meta_description : null,
    author: typeof body.author === "string" ? body.author : "Equipo Alquidel",
    status: "publicado",
    published_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("posts").insert(payload).select().single();
  if (error) {
    return json({ error: error.message }, 500);
  }

  const origin = req.headers.get("origin") ?? "";
  return json({
    success: true,
    id: data.id,
    slug: data.slug,
    url: `${origin}/blog/${data.slug}`,
  });
});