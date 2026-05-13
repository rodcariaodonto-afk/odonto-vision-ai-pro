// Shared helpers for governance edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export async function getUserFromRequest(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token) return { user: null, error: "missing token" } as const;
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { user: null, error: error?.message ?? "invalid" } as const;
  return { user: data.user, error: null } as const;
}

export async function isAdmin(userId: string) {
  const sb = serviceClient();
  const { data } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export async function logAudit(opts: {
  actor_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  event_type: string;
  resource_type?: string;
  resource_id?: string;
  severity?: "info" | "warn" | "critical";
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const sb = serviceClient();
    await sb.from("audit_logs").insert({
      actor_id: opts.actor_id ?? null,
      actor_email: opts.actor_email ?? null,
      actor_role: opts.actor_role ?? null,
      event_type: opts.event_type,
      resource_type: opts.resource_type ?? null,
      resource_id: opts.resource_id ?? null,
      severity: opts.severity ?? "info",
      ip_address: opts.ip_address ?? null,
      user_agent: opts.user_agent ?? null,
      metadata: opts.metadata ?? {},
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}

export function clientMeta(req: Request) {
  return {
    ip_address:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      null,
    user_agent: req.headers.get("user-agent"),
  };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}