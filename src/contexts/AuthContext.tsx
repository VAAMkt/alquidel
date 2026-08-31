import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Suscribirse PRIMERO al stream de eventos de auth
    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      switch (event) {
        case "INITIAL_SESSION":
        case "SIGNED_IN":
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          setIsAuthLoading(false);
          break;
        case "SIGNED_OUT":
          setSession(null);
          setUser(null);
          setIsAuthLoading(false);
          break;
        case "TOKEN_REFRESHED":
          setSession(nextSession);
          break;
        case "USER_UPDATED":
          setSession(nextSession);
          setUser(nextSession?.user ?? null);
          break;
        default:
          break;
      }
    });

    // 2. Respaldo: si INITIAL_SESSION no llegara, resolver el loading manualmente
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession((prev) => prev ?? data.session);
        setUser((prev) => prev ?? data.session?.user ?? null);
      })
      .finally(() => {
        if (mounted) setIsAuthLoading(false);
      });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    session,
    user,
    isAuthLoading,
    isAuthenticated: !!session?.user,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  // Fallback seguro para SSR o árboles sin provider: evita crashear el render.
  // El provider real toma el control en cuanto está disponible (cliente).
  if (!ctx) {
    return {
      session: null,
      user: null,
      isAuthLoading: true,
      isAuthenticated: false,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    };
  }
  return ctx;
}