import { createFileRoute, notFound } from "@tanstack/react-router";
import { CityLandingPage } from "@/components/public/CityLandingPage";
import { cityLandingQueryOptions } from "@/lib/landings.query";
import { findCityLanding } from "@/lib/landings";

export const Route = createFileRoute("/arriendos/$ciudad")({
  loader: async ({ params, context }) => {
    const city = findCityLanding(params.ciudad);
    if (!city) throw notFound();
    await context.queryClient.ensureQueryData(cityLandingQueryOptions(city.city, "arriendo"));
    return { city };
  },
  head: ({ params, loaderData }) => {
    const city = loaderData?.city ?? findCityLanding(params.ciudad);
    if (!city) {
      return {
        meta: [{ title: "Página no encontrada" }, { name: "robots", content: "noindex" }],
      };
    }
    const url = `https://alquidel.com/arriendos/${city.slug}`;
    const title = `Inmuebles en arriendo en ${city.label} | Alquidel Bienes Raíces`;
    const description = `Apartamentos, casas, oficinas y locales en arriendo en ${city.label}. Inventario verificado y acompañamiento de un asesor Alquidel.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inicio", item: "https://alquidel.com/" },
              {
                "@type": "ListItem",
                position: 2,
                name: "Propiedades",
                item: "https://alquidel.com/propiedades",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: `Arriendos en ${city.label}`,
                item: url,
              },
            ],
          }),
        },
      ],
    };
  },
  component: ArriendosCiudad,
});

function ArriendosCiudad() {
  const { city } = Route.useLoaderData();
  return <CityLandingPage city={city} operacion="arriendo" />;
}
