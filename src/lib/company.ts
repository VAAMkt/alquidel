import mariaPhoto from "@/assets/maria-antonia-arroyo.jpg.asset.json";
import freddyPhoto from "@/assets/freddy-delgado.png.asset.json";
import marcelaPhoto from "@/assets/marcela-moreno.png.asset.json";

/**
 * Datos reales de Alquidel Bienes Raíces S.A.S.
 * Centralizados aquí para usarse en footer, contacto, detalle y nosotros.
 */
export const COMPANY = {
  name: "Alquidel Bienes Raíces S.A.S.",
  shortName: "Alquidel",
  tagline: "Encuentra la propiedad de tus sueños en Colombia",
  address: "Calle 138 #74-51, Oficina 09, Bogotá",
  phone: "+57 321 491 0400",
  phoneHref: "tel:+573214910400",
  pbx: "(601) 583 6744",
  pbxHref: "tel:+576015836744",
  email: "comercialalquidel@gmail.com",
  emailHref: "mailto:comercialalquidel@gmail.com",
  whatsappNumber: "573214910400",
  whatsappUrl: "https://wa.me/573214910400",
  about:
    "Empresa colombiana dedicada a la comercialización de bienes raíces, que ofrece servicios integrales basándonos en las necesidades de nuestros clientes para brindarles la mejor asesoría inmobiliaria y mejorar su calidad de vida.",
  mission:
    "Prestar el mejor y más completo servicio inmobiliario, trabajando profesionalmente, con el fin de formar clientes de por vida.",
  vision:
    "Ser una organización referente en el mercado inmobiliario, destacada por su solidez, credibilidad y resultados.",
  social: {
    facebook: "https://www.facebook.com/alquidelbienesraices",
    instagram: "https://www.instagram.com/alquidelbrsas/",
  },
} as const;

/** Señales de confianza verificadas por Alquidel. */
export const TRUST = {
  yearsLabel: "+23 años",
  yearsCaption: "de experiencia de sus fundadores",
  propertiesLabel: "+2.000",
  propertiesCaption: "inmuebles gestionados",
  foundedLabel: "2019",
  foundedCaption: "año de fundación de Alquidel",
} as const;

/** Aliados y portales con los que trabajamos. */
export const PARTNERS = [
  "Metro Cuadrado",
  "Finca Raíz",
  "100 Cuadras",
  "Seguros Sura",
  "Libertador",
  "Affi",
  "Bancolombia",
  "Davivienda",
  "BBVA",
  "Banco Popular",
] as const;

/** Equipo Alquidel. */
export const TEAM = [
  {
    name: "Freddy Delgado",
    role: "Gerente General",
    photo: freddyPhoto.url,
  },
  {
    name: "Maria Antonia Arroyo",
    role: "Directora Comercial",
    photo: mariaPhoto.url,
  },
  {
    name: "Marcela Moreno",
    role: "Asistente Administrativa",
    photo: marcelaPhoto.url,
  },
] as const;
