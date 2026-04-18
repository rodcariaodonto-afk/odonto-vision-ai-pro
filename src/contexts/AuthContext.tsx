import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
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
  isBlocked: boolean;
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
  const [isBlocked, setIsBlocked] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const userIdRef = useRef<string | null>(null);

  const checkBlockedStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("blocked_at")
        .eq("user_id", userId)
        .maybeSingle();
      const blocked = !!data?.blocked_at;
      setIsBlocked(blocked);
      return blocked;
    } catch {
      setIsBlocked(false);
      return false;
    }
  };

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
        sessionRef.current = session;
        userIdRef.current = session?.user?.id ?? null;
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

        const nextUser = newSession?.user ?? null;
        const nextUserId = nextUser?.id ?? null;
        const sameUser = userIdRef.current !== null && userIdRef.current === nextUserId;

        if (event === 'SIGNED_IN') {
          sessionRef.current = newSession;
          userIdRef.current = nextUserId;

          if (sameUser) {
            return;
          }

          setSession(newSession);
          setUser(nextUser);
          setLoading(false);
          if (newSession) {
            setTimeout(() => checkSubscription(), 0);
          }
          return;
        }

        if (event === 'SIGNED_OUT') {
          sessionRef.current = null;
          userIdRef.current = null;
          setSession(null);
          setUser(null);
          setSubscription(null);
          setLoading(false);
          return;
        }

        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          sessionRef.current = newSession;
          userIdRef.current = nextUserId;

          if (sameUser) {
            return;
          }

          setSession(newSession);
          setUser(nextUser);
        }
      }
    );

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
    };
  }, []);

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
