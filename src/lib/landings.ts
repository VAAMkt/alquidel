/**
 * Configuración de landings hiperlocales (/arriendos/:ciudad y /venta/:ciudad).
 * Solo se publican ciudades con inventario real para evitar páginas vacías.
 */

export type Operacion = "arriendo" | "venta";

export interface CityLanding {
  /** Slug en la URL (sin tildes). */
  slug: string;
  /** Nombre exacto tal como está guardado en la base de datos. */
  city: string;
  /** Nombre para mostrar en textos. */
  label: string;
  /** Contexto de la ciudad, redactado con información verificable. */
  intro: string;
}

export const CITY_LANDINGS: CityLanding[] = [
  {
    slug: "bogota",
    city: "Bogotá",
    label: "Bogotá",
    intro:
      "Bogotá concentra la mayor parte de nuestro inventario: apartamentos, casas, oficinas, locales y bodegas. Nuestra oficina está en la Calle 138 #74-51, en el norte de la ciudad, y acompañamos visitas en toda el área urbana.",
  },
  {
    slug: "chia",
    city: "Chía",
    label: "Chía",
    intro:
      "Chía es una de las alternativas más buscadas por familias que quieren salir de Bogotá sin alejarse: casas con más área y zonas verdes, a pocos minutos del norte de la ciudad por la Autopista Norte.",
  },
  {
    slug: "cajica",
    city: "Cajicá",
    label: "Cajicá",
    intro:
      "Cajicá combina vivienda campestre y actividad comercial creciente sobre el corredor de la Autopista Norte, con locales y espacios comerciales en zonas de alto flujo.",
  },
  {
    slug: "cali",
    city: "Cali",
    label: "Cali",
    intro:
      "En Cali gestionamos principalmente inmuebles corporativos: oficinas y espacios de trabajo en sectores empresariales de la ciudad.",
  },
  {
    slug: "mosquera",
    city: "Mosquera",
    label: "Mosquera",
    intro:
      "Mosquera, en la Sabana Occidente, ofrece vivienda con precios más accesibles que Bogotá y buena conexión por la Calle 13 y la Calle 80.",
  },
];

export function findCityLanding(slug: string): CityLanding | undefined {
  return CITY_LANDINGS.find((c) => c.slug === slug);
}

export const OPERACION_COPY: Record<
  Operacion,
  { verb: string; noun: string; pathPrefix: string; label: string }
> = {
  arriendo: {
    verb: "en arriendo",
    noun: "arriendo",
    pathPrefix: "/arriendos",
    label: "Arriendos",
  },
  venta: {
    verb: "en venta",
    noun: "venta",
    pathPrefix: "/venta",
    label: "Venta",
  },
};
