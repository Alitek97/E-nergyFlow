import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Session, User, AuthError } from "@supabase/supabase-js";
import { signInAsGuest, isGuestUser, clearGuestUserId, storeGuestUserId } from "@/lib/guestAuth";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  authError: string | null;
  isConfigured: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  upgradeGuestAccount: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isGuest = isGuestUser(user);

  useEffect(() => {
    const initAuth = async () => {
      // If Supabase is not configured, skip auth initialization
      // App will work in offline/local-only mode
      if (!isSupabaseConfigured) {
        console.log("[Auth] Supabase not configured - running in local-only mode");
        setAuthError("Cloud sync unavailable - running in offline mode");
        setLoading(false);
        return;
      }

      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession) {
          setSession(existingSession);
          setUser(existingSession.user);
          
          if (isGuestUser(existingSession.user)) {
            await storeGuestUserId(existingSession.user.id);
          }
          
          setLoading(false);
          return;
        }

        const result = await signInAsGuest();
        if (!result.success) {
          console.log("Guest auth status:", result.error);
          if (result.requiresSetup) {
            setAuthError(result.error || "Anonymous sign-in requires setup");
          }
        }
        
        const { data: { session: newSession } } = await supabase.auth.getSession();
        setSession(newSession);
        setUser(newSession?.user ?? null);
      } catch (error) {
        console.error("Auth initialization error:", error);
        setAuthError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && isGuestUser(session.user)) {
          await storeGuestUserId(session.user.id);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || "Engineer",
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      setAuthError(null);
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await clearGuestUserId();
    
    const result = await signInAsGuest();
    if (!result.success && result.requiresSetup) {
      setAuthError(result.error || "Anonymous sign-in requires setup");
    } else {
      setAuthError(null);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const upgradeGuestAccount = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ error: string | null }> => {
    if (!user || !session) {
      return { error: "No user session found" };
    }

    if (!user.is_anonymous) {
      return { error: "Not a guest account" };
    }

    const { error: linkError } = await supabase.auth.updateUser({
      email,
      password,
      data: {
        display_name: displayName || "Engineer",
      },
    });

    if (linkError) {
      return { error: linkError.message };
    }

    await clearGuestUserId();
    setAuthError(null);
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isGuest,
        authError,
        isConfigured: isSupabaseConfigured,
        signUp,
        signIn,
        signOut,
        resetPassword,
        upgradeGuestAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
