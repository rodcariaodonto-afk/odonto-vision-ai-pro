import { corsHeaders, getUserFromRequest, logAudit, clientMeta, jsonResponse } from "../_shared/governance.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) return jsonResponse({ error: "unauthorized" }, 401);
    const body = await req.json();
    const meta = clientMeta(req);
    await logAudit({
      actor_id: user.id,
      actor_email: user.email,
      event_type: String(body.event_type || "unknown"),
      resource_type: body.resource_type,
      resource_id: body.resource_id,
      severity: body.severity ?? "info",
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
      metadata: body.metadata ?? {},
    });
    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});