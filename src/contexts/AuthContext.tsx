import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionStatus {
  subscribed: boolean;
  plan: string | null;
  planEnd: string | null;
  analysesRemaining: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: SubscriptionStatus | null;
  subscriptionLoading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const checkSubscription = async () => {
    // Get the current session to ensure we have a valid token
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession) {
      console.log("No session available for subscription check");
      setSubscription(null);
      return;
    }

    console.log("Checking subscription for:", currentSession.user?.email);
    setSubscriptionLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      console.log("Subscription check result:", { data, error });
      
      if (error) {
        console.error("Error checking subscription:", error);
        setSubscription({ subscribed: false, plan: null, planEnd: null, analysesRemaining: 0 });
      } else {
        setSubscription({
          subscribed: data?.subscribed || false,
          plan: data?.plan || null,
          planEnd: data?.plan_end || null,
          analysesRemaining: data?.analyses_remaining || 0,
        });
      }
    } catch (err) {
      console.error("Subscription check failed:", err);
      setSubscription({ subscribed: false, plan: null, planEnd: null, analysesRemaining: 0 });
    } finally {
      setSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // FIRST check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session) {
          checkSubscription();
        }
      }
    });

    // Set up auth state listener for ACTUAL auth changes only
    // IMPORTANT: ignore TOKEN_REFRESHED when the user is the same to avoid
    // re-renders (and state loss) when the user switches tabs / returns focus.
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        // Ignore events fired purely because the tab was hidden/restored.
        // Supabase re-emits SIGNED_IN on visibility change which would otherwise
        // re-trigger checkSubscription() and cause page state to reset.
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }

        if (event === 'SIGNED_IN') {
          // If this is just a session rehydration for the SAME user, ignore it
          // to prevent unnecessary re-renders / subscription rechecks.
          const sameUser = newSession?.user?.id && newSession.user.id === user?.id;
          if (sameUser) {
            setSession(newSession);
            return;
          }
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
          if (newSession) {
            setTimeout(() => checkSubscription(), 0);
          }
          return;
        }

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setSubscription(null);
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // Update session token silently WITHOUT changing user identity reference
          // unless the user id actually changed (prevents downstream re-renders).
          setSession(newSession);
          setUser((prev) => {
            const next = newSession?.user ?? null;
            if (prev?.id === next?.id) return prev; // keep same reference
            return next;
          });
        }
      }
    );

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
    };
  }, []);

  // NOTE: Periodic subscription polling was removed to prevent unwanted page
  // refreshes (e.g., when the user switches browser tabs and returns).
  // Subscription is checked on initial load, on SIGNED_IN, and manually via
  // checkSubscription() after relevant actions (checkout, analysis, etc.).

  const signUp = async (email: string, password: string, name?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name || "",
        },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSubscription(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      subscription, 
      subscriptionLoading,
      signUp, 
      signIn, 
      signOut,
      checkSubscription 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
