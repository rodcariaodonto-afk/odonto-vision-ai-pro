import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product IDs mapped to plans
const PRODUCTS = {
  por_caso: "prod_TZcXMHLEIvxKiy",
  mensal: "prod_TZcZGldD1idICC",
  anual: "prod_TZcoHePuTNV00I",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Admin has full access without payment
    const ADMIN_EMAIL = "rodcaria.odonto@gmail.com";
    if (user.email === ADMIN_EMAIL) {
      logStep("Admin user detected - granting full access");
      return new Response(JSON.stringify({
        subscribed: true,
        plan: "admin",
        plan_end: null,
        analyses_remaining: -1, // unlimited
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if user is a test user with active trial
    const { data: testUser, error: testUserError } = await supabaseClient
      .from("test_users")
      .select("*")
      .eq("email", user.email)
      .eq("is_active", true)
      .single();

    if (testUser && !testUserError) {
      const expiresAt = new Date(testUser.expires_at);
      const now = new Date();
      
      if (expiresAt > now) {
        const analysesRemaining = testUser.analyses_limit - testUser.analyses_used;
        logStep("Test user detected - granting trial access", {
          email: user.email,
          expiresAt: testUser.expires_at,
          analysesUsed: testUser.analyses_used,
          analysesRemaining
        });
        
        return new Response(JSON.stringify({
          subscribed: true,
          plan: "teste",
          plan_end: testUser.expires_at,
          analyses_remaining: analysesRemaining > 0 ? analysesRemaining : 0,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        logStep("Test user trial expired", { email: user.email, expiresAt: testUser.expires_at });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        plan: null,
        plan_end: null,
        analyses_remaining: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Check for active subscriptions (mensal plan)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const productId = subscription.items.data[0].price.product as string;
      const planEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      logStep("Active subscription found", { subscriptionId: subscription.id, productId, planEnd });
      
      return new Response(JSON.stringify({
        subscribed: true,
        plan: "mensal",
        plan_end: planEnd,
        analyses_remaining: 20, // Monthly plan limit
        product_id: productId,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check for one-time purchases (por_caso and anual)
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      limit: 100,
    });

    // Check completed checkouts for one-time purchases
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 100,
    });

    const now = new Date();
    let activePlan: string | null = null;
    let planEnd: string | null = null;
    let analysesRemaining = 0;

    for (const session of sessions.data) {
      if (session.payment_status === "paid" && session.metadata?.plan_id) {
        const planId = session.metadata.plan_id;
        const purchaseDate = new Date(session.created * 1000);
        
        if (planId === "anual") {
          // Annual plan valid for 1 year
          const expiryDate = new Date(purchaseDate);
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
          
          if (expiryDate > now) {
            activePlan = "anual";
            planEnd = expiryDate.toISOString();
            analysesRemaining = 200; // Annual limit - would need to track usage
            logStep("Active annual plan found", { purchaseDate, expiryDate });
            break;
          }
        } else if (planId === "por_caso") {
          // Por caso - check if recently purchased and not used
          // For simplicity, mark as active if purchased in last 24h
          const expiryDate = new Date(purchaseDate);
          expiryDate.setHours(expiryDate.getHours() + 24);
          
          if (expiryDate > now) {
            activePlan = "por_caso";
            planEnd = expiryDate.toISOString();
            analysesRemaining = 1;
            logStep("Active per-case plan found", { purchaseDate });
          }
        }
      }
    }

    logStep("Subscription check complete", { activePlan, planEnd, analysesRemaining });

    return new Response(JSON.stringify({
      subscribed: activePlan !== null,
      plan: activePlan,
      plan_end: planEnd,
      analyses_remaining: analysesRemaining,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
