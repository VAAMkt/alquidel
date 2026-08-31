/**
 * Medición propia de visitas (sin cookies de terceros).
 * Guarda un identificador anónimo de visitante y de sesión en localStorage
 * y registra cada página vista con su duración.
 */

const VISITOR_KEY = "alquidel-visitor-id";
const SESSION_KEY = "alquidel-session";
const SESSION_TTL_MS = 30 * 60 * 1000;

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "";

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = uid();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function getSessionId(): string {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { id: string; last: number };
      if (parsed?.id && now - parsed.last < SESSION_TTL_MS) {
        localStorage.setItem(
          SESSION_KEY,
          JSON.stringify({ id: parsed.id, last: now }),
        );
        return parsed.id;
      }
    }
  } catch {
    /* ignore */
  }
  const id = uid();
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, last: now }));
  } catch {
    /* ignore */
  }
  return id;
}

export type PageViewMeta = {
  propertyId?: string | null;
  city?: string | null;
};

type Pending = {
  path: string;
  startedAt: number;
  meta: PageViewMeta;
  sent: boolean;
};

let pending: Pending | null = null;

function send(row: Record<string, unknown>, keepalive: boolean) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    void fetch(`${SUPABASE_URL}/rest/v1/page_views`, {
      method: "POST",
      keepalive,
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    }).catch(() => {});
  } catch {
    /* silencioso */
  }
}

function flush(keepalive: boolean) {
  if (!pending || pending.sent) return;
  pending.sent = true;
  const duration = Math.max(0, Math.min(Date.now() - pending.startedAt, 7_200_000));
  send(
    {
      path: pending.path.slice(0, 300),
      property_id: pending.meta.propertyId ?? null,
      city: pending.meta.city ?? null,
      referrer: (typeof document !== "undefined" ? document.referrer : "").slice(0, 500) || null,
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      duration_ms: duration,
    },
    keepalive,
  );
}

/** Registra la salida de la página anterior y comienza a medir la nueva. */
export function startPageView(path: string, meta: PageViewMeta = {}) {
  if (typeof window === "undefined") return;
  if (pending && pending.path === path) {
    pending.meta = { ...pending.meta, ...meta };
    return;
  }
  flush(false);
  pending = { path, startedAt: Date.now(), meta, sent: false };
}

/** Enriquece la vista actual (por ejemplo con la propiedad y su ciudad). */
export function annotatePageView(meta: PageViewMeta) {
  if (pending) pending.meta = { ...pending.meta, ...meta };
}

/** Envía la vista actual (al cerrar la pestaña o cambiar de ruta). */
export function flushPageView(keepalive = true) {
  flush(keepalive);
  pending = null;
}
