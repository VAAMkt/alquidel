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
