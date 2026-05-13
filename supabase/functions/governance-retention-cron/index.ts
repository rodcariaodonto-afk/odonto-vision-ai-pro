import { corsHeaders, serviceClient, logAudit, jsonResponse } from "../_shared/governance.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const sb = serviceClient();
    // expire old exports
    const { data: expired } = await sb
      .from("data_exports")
      .update({ status: "expired" })
      .lt("expires_at", new Date().toISOString())
      .neq("status", "expired")
      .select("id");

    // execute confirmed deletions whose scheduled_for has passed (auto-execute window)
    const { data: dueDeletions } = await sb
      .from("deletion_queue")
      .select("*")
      .eq("status", "confirmed")
      .lte("scheduled_for", new Date().toISOString());

    for (const row of dueDeletions ?? []) {
      try {
        if (row.resource_type === "case") {
          await sb.from("cases").delete().eq("id", row.resource_id);
        }
        await sb.from("deletion_queue").update({
          status: "executed",
          executed_at: new Date().toISOString(),
        }).eq("id", row.id);
        await logAudit({
          event_type: "deletion_executed_cron",
          resource_type: row.resource_type,
          resource_id: row.resource_id,
          severity: "critical",
        });
      } catch (e) {
        console.error("deletion exec failed", row.id, e);
      }
    }

    return jsonResponse({
      ok: true,
      expired_exports: expired?.length ?? 0,
      executed_deletions: (dueDeletions ?? []).length,
    });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});