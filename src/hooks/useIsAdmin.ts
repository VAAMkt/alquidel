import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Comprueba si el usuario actual tiene rol "admin" leyendo `user_roles`
 * directamente desde el cliente. La política RLS "Usuario ve sus propios roles"
 * permite a cada usuario leer sus propias filas, así que esto es seguro.
 *
 * No usamos un server function aquí a propósito: tenerlo en el sidebar (que
 * se renderiza en cada ruta /admin) hacía que cualquier fallo de transformación
 * del módulo de server functions tumbase todo el panel.
 */
export function useIsAdmin() {
  const { session, isAuthLoading } = useAuth();
  const userId = session?.user?.id;

  const query = useQuery({
    queryKey: ["auth", "is-admin", userId],
    enabled: !isAuthLoading && !!userId,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });

  return {
    isAdmin: query.data === true,
    isLoading: isAuthLoading || query.isLoading,
    isAuthenticated: !!userId,
  };
}