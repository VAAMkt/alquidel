import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        const origin = "https://alquidel.com";
        const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /login

Sitemap: ${origin}/sitemap.xml
`;
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});