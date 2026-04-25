import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "alquidel-favorites";

interface FavoritesContextValue {
  ids: string[];
  count: number;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
  clear: () => void;
  removeOrphanIds: (orphanIds: string[]) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hidratar desde localStorage solo en cliente
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setIds(parsed.filter((x): x is string => typeof x === "string"));
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // ignore
    }
  }, [ids, hydrated]);

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    setIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const clear = useCallback(() => setIds([]), []);

  // Elimina IDs que ya no existen en DB y persiste el resultado
  // a localStorage en el mismo paso para evitar re-render fantasma.
  const removeOrphanIds = useCallback((orphanIds: string[]) => {
    if (orphanIds.length === 0) return;
    setIds((prev) => {
      const next = prev.filter((id) => !orphanIds.includes(id));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ ids, count: ids.length, isFavorite, toggle, clear, removeOrphanIds }),
    [ids, isFavorite, toggle, clear, removeOrphanIds],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  return ctx;
}