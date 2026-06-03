import { corsHeaders, getUserFromRequest, logAudit, clientMeta, jsonResponse } from "../_shared/governance.ts";

// Strict allowlist of event types regular authenticated users may log from the client.
// Security-sensitive events (export_download, deletion_*, role_change, policy_change, etc.)
// must be written server-side from the edge function that performs the action, using the
// service role — never via this generic client-facing endpoint.
const USER_ALLOWED_EVENT_TYPES = new Set<string>([
  "user_login",
  "user_logout",
  "page_view",
  "case_view",
  "exam_upload",
  "case_compare",
  "support_message",
]);

const MAX_METADATA_BYTES = 2048;

function sanitizeMetadata(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  try {
    const json = JSON.stringify(input);
    if (json.length > MAX_METADATA_BYTES) {
      return { _truncated: true, _original_size: json.length };
    }
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) return jsonResponse({ error: "unauthorized" }, 401);
    const body = await req.json().catch(() => ({}));
    const event_type = String(body?.event_type ?? "");
    if (!USER_ALLOWED_EVENT_TYPES.has(event_type)) {
      return jsonResponse({ error: "event_type not allowed" }, 400);
    }
    const resource_type =
      typeof body?.resource_type === "string" ? body.resource_type.slice(0, 64) : undefined;
    const resource_id =
      typeof body?.resource_id === "string" ? body.resource_id.slice(0, 128) : undefined;
    const meta = clientMeta(req);
    await logAudit({
      actor_id: user.id,
      actor_email: user.email,
      event_type,
      resource_type,
      resource_id,
      // Force severity to 'info' — clients may never inject warn/critical.
      severity: "info",
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
      metadata: sanitizeMetadata(body?.metadata),
    });
    return jsonResponse({ ok: true });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});