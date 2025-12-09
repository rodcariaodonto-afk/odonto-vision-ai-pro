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
    if (!session) {
      setSubscription(null);
      return;
    }

    setSubscriptionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
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
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Only update if there's an actual auth change (not just visibility)
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (mounted) {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setLoading(false);

            if (newSession && event === 'SIGNED_IN') {
              setTimeout(() => {
                checkSubscription();
              }, 0);
            } else if (event === 'SIGNED_OUT') {
              setSubscription(null);
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
    };
  }, []);

  // Periodically check subscription (every 60 seconds)
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      checkSubscription();
    }, 60000);

    return () => clearInterval(interval);
  }, [session]);

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
