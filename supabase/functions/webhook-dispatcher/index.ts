import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// HMAC SHA256 para assinar payloads
async function hmacSha256(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { clinic_id, event, payload } = await req.json();

  // Buscar webhooks ativos desta clínica
  const { data: webhooks } = await supabase
    .from("webhook_configs")
    .select("*")
    .eq("clinic_id", clinic_id)
    .eq("active", true);

  if (!webhooks?.length) {
    return new Response(JSON.stringify({ dispatched: 0 }), { headers: corsHeaders });
  }

  let dispatched = 0;

  for (const wh of webhooks) {
    const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
    const signature = await hmacSha256(wh.secret_hash, body);

    let success = false;
    let lastError = "";

    // 3 tentativas com backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        const delay = attempt === 1 ? 60_000 : 300_000; // 1min, 5min
        await new Promise(r => setTimeout(r, Math.min(delay, 10_000))); // cap em 10s no edge
      }

      try {
        const resp = await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-odontovision-signature": `sha256=${signature}`,
            "x-odontovision-event": event,
          },
          body,
          signal: AbortSignal.timeout(15_000),
        });

        if (resp.ok) { success = true; break; }
        lastError = `HTTP ${resp.status}`;
      } catch (err: any) {
        lastError = err.message || "timeout";
      }
    }

    // Atualizar status do webhook
    const newFailureCount = success ? 0 : wh.failure_count + 1;
    const shouldDisable = newFailureCount >= 3;

    await supabase
      .from("webhook_configs")
      .update({
        failure_count: newFailureCount,
        last_triggered_at: new Date().toISOString(),
        last_status: success ? "success" : "failed",
        active: shouldDisable ? false : wh.active,
      })
      .eq("id", wh.id);

    if (success) dispatched++;
    else console.warn(`Webhook ${wh.id} falhou: ${lastError}. Falhas: ${newFailureCount}`);
  }

  return new Response(
    JSON.stringify({ dispatched, total: webhooks.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
