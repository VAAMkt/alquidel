import { cn } from "@/lib/utils";

export const LEAD_STATUSES = [
  "nuevo",
  "contactado",
  "interesado",
  "cerrado",
  "descartado",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = ["formulario", "chat", "whatsapp", "manual"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  interesado: "Interesado",
  cerrado: "Cerrado",
  descartado: "Descartado",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  formulario: "Formulario",
  chat: "Chat",
  whatsapp: "WhatsApp",
  manual: "Manual",
};

const STATUS_CLASSES: Record<LeadStatus, string> = {
  nuevo:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  contactado:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  interesado:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900",
  cerrado:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900",
  descartado:
    "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800",
};

const SOURCE_CLASSES: Record<LeadSource, string> = {
  formulario:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
  chat: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  whatsapp:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900",
  manual:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
};

export function StatusBadge({ status, className }: { status: LeadStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

export function SourceBadge({ source, className }: { source: LeadSource; className?: string }) {
  const safe = (LEAD_SOURCES as readonly string[]).includes(source) ? source : "formulario";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        SOURCE_CLASSES[safe as LeadSource],
        className,
      )}
    >
      {LEAD_SOURCE_LABELS[safe as LeadSource]}
    </span>
  );
}

export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/[^\d]/g, "");
}

export function whatsappLink(phone: string | null | undefined): string {
  const digits = normalizePhone(phone);
  if (!digits) return "";
  // Si ya empieza con 57 (Colombia) lo dejamos, si no lo prefijamos
  const withCountry = digits.startsWith("57") ? digits : `57${digits}`;
  return `https://wa.me/${withCountry}`;
}
