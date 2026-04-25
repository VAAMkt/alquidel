import { COMPANY } from "./company";

/**
 * Construye una URL de WhatsApp con el mensaje pre-llenado.
 * Si no se pasa mensaje, devuelve la URL base al número de Alquidel.
 */
export function whatsappUrl(message?: string): string {
  if (!message) return COMPANY.whatsappUrl;
  return `${COMPANY.whatsappUrl}?text=${encodeURIComponent(message)}`;
}

export function propertyWhatsappMessage(title: string): string {
  return `Hola, me interesa la propiedad: ${title}`;
}

/**
 * Construye un mensaje de "compartir" para enviar el enlace por WhatsApp.
 */
export function shareWhatsappUrl(title: string, url: string): string {
  const msg = `Mira esta propiedad en Alquidel: ${title} — ${url}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}
