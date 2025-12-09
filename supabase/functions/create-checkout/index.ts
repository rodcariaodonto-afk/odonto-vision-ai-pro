import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Price IDs from Stripe
const PRICES = {
  por_caso: "price_1ScTIi0eNFT13oWK1LSDWRDi", // R$15 one-time
  mensal: "price_1ScTKL0eNFT13oWKYevlGEsp",   // R$97/month recurring
  anual: "price_1ScTZ40eNFT13oWK4pBt8hDT",    // R$897 one-time (1 year)
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { planId, isAuthenticated } = await req.json();
    logStep("Plan requested", { planId, isAuthenticated });

    if (!planId || !PRICES[planId as keyof typeof PRICES]) {
      throw new Error(`Invalid plan: ${planId}`);
    }

    const priceId = PRICES[planId as keyof typeof PRICES];
    const isSubscription = planId === "mensal";
    logStep("Price determined", { priceId, isSubscription });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const origin = req.headers.get("origin") || "https://lovable.dev";
    let customerId: string | undefined;
    let customerEmail: string | undefined;
    let userId: string | undefined;

    // Check if user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (authHeader && isAuthenticated) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );

      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      const user = data.user;
      
      if (user?.email) {
        userId = user.id;
        customerEmail = user.email;
        logStep("User authenticated", { userId, email: customerEmail });

        // Check if customer exists
        const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
        if (customers.data.length > 0) {
          customerId = customers.data[0].id;
          logStep("Existing customer found", { customerId });
        }
      }
    }

    // Build checkout session config
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: isSubscription ? "subscription" : "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
      cancel_url: `${origin}/plans`,
      metadata: {
        user_id: userId || "",
        plan_id: planId,
        is_new_user: isAuthenticated ? "false" : "true",
      },
    };

    // Annual plan is single payment only (no installments)

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
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
