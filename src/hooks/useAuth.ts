import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface AuthState {
  session: Session | null;
  user: User | null;
  /** Alias retro-compatible de isAuthLoading. */
  loading: boolean;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

/**
 * Hook único de autenticación. Consume el AuthContext global, por lo que NO
 * crea listeners propios ni llama a getSession por su cuenta.
 */
export function useAuth(): AuthState {
  const { session, user, isAuthLoading, isAuthenticated, signOut } = useAuthContext();
  return {
    session,
    user,
    loading: isAuthLoading,
    isAuthLoading,
    isAuthenticated,
    signOut,
  };
}

/**
 * Helper suelto para componentes que importan signOut como función pura
 * (p.ej. el sidebar). Llama directamente a Supabase; el AuthProvider
 * recibirá el evento SIGNED_OUT y limpiará el estado global.
 */
export async function signOut() {
  await supabase.auth.signOut();
}
