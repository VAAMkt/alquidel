import { useCallback, useEffect, useState } from "react";

const KEY = "alquidel-recent-views";
const MAX = 3;

/**
 * Hook que persiste los últimos slugs de propiedades visitadas en localStorage.
 * Solo se hidrata en cliente para evitar SSR mismatch.
 */
export function useRecentViews() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSlugs(parsed.filter((x): x is string => typeof x === "string").slice(0, MAX));
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const push = useCallback((slug: string) => {
    if (typeof window === "undefined" || !slug) return;
    try {
      const raw = localStorage.getItem(KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = [slug, ...list.filter((s) => s !== slug)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
      setSlugs(next);
    } catch {
      // ignore
    }
  }, []);

  return { slugs, push, hydrated };
}
