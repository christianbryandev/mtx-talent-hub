import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  status: "loading" | "authenticated" | "unauthenticated";
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setLoading(false);
  }, []);

  const refreshSession = useCallback(async () => {
    setLoading(true);

    const { data: current, error: currentError } = await supabase.auth.getSession();
    if (currentError) {
      console.error(currentError);
      applySession(null);
      return null;
    }

    if (current.session) {
      applySession(current.session);
      return current.session;
    }

    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error(error);
      applySession(null);
      return null;
    }

    applySession(data.session ?? null);
    return data.session ?? null;
  }, [applySession]);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (newSession) {
        applySession(newSession);
        return;
      }

      if (event === "SIGNED_OUT") {
        applySession(null);
        return;
      }

      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        return;
      }

      await refreshSession();
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;
      applySession(currentSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession, refreshSession]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      status: loading ? "loading" : session ? "authenticated" : "unauthenticated",
      isAuthenticated: !!session,
      signOut,
      refreshSession,
    }),
    [loading, refreshSession, session, signOut],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
