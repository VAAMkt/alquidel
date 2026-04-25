import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import type { PropertyCardData } from "@/components/public/PropertyCard";

const MAX = 3;

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

  const isInCompare = useCallback(
    (id: string) => items.some((p) => p.id === id),
    [items],
  );

  const add = useCallback(
    (p: PropertyCardData) => {
      setItems((prev) => {
        if (prev.some((x) => x.id === p.id)) return prev;
        if (prev.length >= MAX) {
          toast.error(`Máximo ${MAX} propiedades para comparar`);
          return prev;
        }
        return [...prev, p];
      });
    },
    [],
  );

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

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare debe usarse dentro de CompareProvider");
  return ctx;
}