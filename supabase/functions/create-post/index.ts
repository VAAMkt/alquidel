// Webhook endpoint for n8n / BlogAut to publish blog posts.
// Auth: Authorization: Bearer <BLOG_WEBHOOK_TOKEN>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// CORS: usa SITE_URL si está configurado; si no, fallback a wildcard.
// TODO: fijar SITE_URL=https://alquidel.com en producción para restringir.
const SITE_URL = Deno.env.get("SITE_URL");
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": SITE_URL || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-client-info, apikey",
  Vary: "Origin",
};

const VALID_CATEGORIES = [
  "compra",
  "venta",
  "inversion",
  "consejos",
  "mercado",
  "legal",
];

// Límites de longitud para inputs
const MAX_TITLE = 200;
const MAX_CONTENT = 50_000;
const MAX_EXCERPT = 500;
const MAX_META_TITLE = 200;
const MAX_META_DESCRIPTION = 500;
const MAX_AUTHOR = 120;
const MAX_TAG = 40;
const MAX_TAGS = 20;
const MAX_COVER_IMAGE = 2_000;

// Rate limiting en memoria: 10 req/min por IP.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (entry.resetAt <= now) rateLimitMap.delete(key);
  }
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}

interface PostPayload {
  title?: unknown;
  content?: unknown;
  excerpt?: unknown;
  cover_image?: unknown;
  category?: unknown;
  tags?: unknown;
  meta_title?: unknown;
  meta_description?: unknown;
  author?: unknown;
}

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

function asString(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Rate limiting por IP
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Demasiadas solicitudes. Intenta en un momento." }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(rl.retryAfter || 60),
        },
      },
    );
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

  let body: PostPayload;
  try {
    body = (await req.json()) as PostPayload;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const title = asString(body.title, MAX_TITLE).trim();
  const content = asString(body.content, MAX_CONTENT);
  if (title.length < 3 || content.length < 10) {
    return json({ error: "title and content are required" }, 400);
  }

  let category = (typeof body.category === "string" ? body.category : "consejos");
  if (!VALID_CATEGORIES.includes(category)) category = "consejos";

  const tags: string[] = Array.isArray(body.tags)
    ? (body.tags as unknown[])
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.slice(0, MAX_TAG))
        .slice(0, MAX_TAGS)
    : [];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Generate unique slug
  const baseSlug = slugify(title) || `post-${Date.now()}`;
  let slug = baseSlug;
  try {
    for (let i = 2; i < 50; i++) {
      const { data: existing } = await supabase
        .from("posts")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${i}`;
    }
  } catch (e) {
    console.error("Error checking slug uniqueness:", e);
    return json({ error: "Error al crear el artículo" }, 500);
  }

  const payload = {
    title,
    slug,
    content,
    excerpt: asString(body.excerpt, MAX_EXCERPT),
    cover_image:
      typeof body.cover_image === "string"
        ? body.cover_image.slice(0, MAX_COVER_IMAGE)
        : null,
    category,
    tags,
    meta_title:
      typeof body.meta_title === "string"
        ? body.meta_title.slice(0, MAX_META_TITLE)
        : null,
    meta_description:
      typeof body.meta_description === "string"
        ? body.meta_description.slice(0, MAX_META_DESCRIPTION)
        : null,
    author:
      typeof body.author === "string"
        ? body.author.slice(0, MAX_AUTHOR)
        : "Equipo Alquidel",
    status: "publicado",
    published_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("posts")
    .insert(payload)
    .select()
    .single();
  if (error) {
    console.error("DB insert error in create-post:", error);
    return json({ error: "Error al crear el artículo" }, 500);
  }

  const origin = req.headers.get("origin") ?? "";
  return json({
    success: true,
    id: data.id,
    slug: data.slug,
    url: `${origin}/blog/${data.slug}`,
  });
});
