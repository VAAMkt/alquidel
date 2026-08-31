import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { PropertyCardData } from "@/components/public/PropertyCard";

const MAX = 3;
const STORAGE_KEY = "alquidel-compare";

interface CompareContextValue {
  items: PropertyCardData[];
  count: number;
  isInCompare: (id: string) => boolean;
  add: (p: PropertyCardData) => void;
  remove: (id: string) => void;
  toggle: (p: PropertyCardData) => void;
  clear: () => void;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PropertyCardData[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hidratar desde localStorage solo en cliente
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Validar shape mínimo de cada item
          const valid = parsed.filter(
            (x): x is PropertyCardData => !!x && typeof x === "object" && typeof x.id === "string",
          );
          setItems(valid.slice(0, MAX));
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  // Persistir cuando cambia
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items, hydrated]);

  // Purgar IDs huérfanos (propiedades eliminadas en DB)
  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("properties")
          .select("id")
          .in(
            "id",
            items.map((i) => i.id),
          );
        if (cancelled || !data) return;
        const validIds = new Set(data.map((d) => d.id));
        setItems((prev) => prev.filter((p) => validIds.has(p.id)));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // Solo cuando hidrate — no en cada cambio
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const isInCompare = useCallback((id: string) => items.some((p) => p.id === id), [items]);

  const add = useCallback((p: PropertyCardData) => {
    setItems((prev) => {
      if (prev.some((x) => x.id === p.id)) return prev;
      if (prev.length >= MAX) {
        toast.error(`Máximo ${MAX} propiedades para comparar`);
        return prev;
      }
      return [...prev, p];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const toggle = useCallback((p: PropertyCardData) => {
    setItems((prev) => {
      if (prev.some((x) => x.id === p.id)) {
        return prev.filter((x) => x.id !== p.id);
      }
      if (prev.length >= MAX) {
        toast.error(`Máximo ${MAX} propiedades para comparar`);
        return prev;
      }
      return [...prev, p];
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, count: items.length, isInCompare, add, remove, toggle, clear }),
    [items, isInCompare, add, remove, toggle, clear],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare debe usarse dentro de CompareProvider");
  return ctx;
}
