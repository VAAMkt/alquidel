/**
 * Capa ligera de medición sobre window.dataLayer (GA4 / GTM).
 * Si no hay dataLayer, los eventos se acumulan igual en el array para que
 * cualquier tag manager que cargue después los procese.
 */
type EventParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function track(event: string, params: EventParams = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...params });
  if (import.meta.env.DEV) {
    console.debug("[analytics]", event, params);
  }
}

/** Clic en cualquier enlace de WhatsApp. `location` identifica dónde ocurrió. */
export function trackWhatsApp(location: string, params: EventParams = {}) {
  track("whatsapp_click", { location, ...params });
}

/** Envío exitoso de un formulario de lead. */
export function trackLeadSubmit(formName: string, params: EventParams = {}) {
  track("lead_form_submit", { form: formName, ...params });
}

/** Clic en los CTA de captación de propietarios (vender / arrendar). */
export function trackOwnerCta(intent: "vender" | "arrendar" | "consignar", location: string) {
  track("owner_cta_click", { intent, location });
}

/** Clic en el botón "Solicitar visita" de una ficha. */
export function trackVisitRequest(propertyId: string, propertySlug: string) {
  track("visit_request", { property_id: propertyId, property_slug: propertySlug });
}
