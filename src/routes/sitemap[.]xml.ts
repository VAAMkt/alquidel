import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const origin = "https://alquidel.com";

        const [{ data: properties }, { data: posts }] = await Promise.all([
          supabaseAdmin
            .from("properties")
            .select("slug, updated_at")
            .order("updated_at", { ascending: false }),
          supabaseAdmin
            .from("posts")
            .select("slug, updated_at")
            .eq("status", "publicado")
            .order("updated_at", { ascending: false }),
        ]);

        const staticUrls = [
          "/",
          "/propiedades",
          "/propietarios",
          "/comparar",
          "/blog",
          "/nosotros",
          "/contacto",
        ];
        const urls: string[] = [];

        for (const path of staticUrls) {
          urls.push(
            `<url><loc>${origin}${path}</loc><changefreq>weekly</changefreq><priority>${path === "/" ? "1.0" : "0.8"}</priority></url>`,
          );
        }
        for (const p of properties ?? []) {
          urls.push(
            `<url><loc>${origin}/propiedades/${p.slug}</loc><lastmod>${p.updated_at}</lastmod><priority>0.7</priority></url>`,
          );
        }
        for (const p of posts ?? []) {
          urls.push(
            `<url><loc>${origin}/blog/${p.slug}</loc><lastmod>${p.updated_at}</lastmod><priority>0.6</priority></url>`,
          );
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});