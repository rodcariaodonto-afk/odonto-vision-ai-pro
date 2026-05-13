import {
  corsHeaders,
  getUserFromRequest,
  isAdmin,
  serviceClient,
  logAudit,
  clientMeta,
  jsonResponse,
} from "../_shared/governance.ts";

// Actions: schedule | confirm | cancel
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) return jsonResponse({ error: "unauthorized" }, 401);
    if (!(await isAdmin(user.id))) return jsonResponse({ error: "forbidden" }, 403);

    const body = await req.json();
    const action: "schedule" | "confirm" | "cancel" = body.action;
    const sb = serviceClient();
    const meta = clientMeta(req);

    if (action === "schedule") {
      const { resource_type, resource_id, user_id, reason } = body;
      if (!resource_type || !resource_id) return jsonResponse({ error: "missing fields" }, 400);
      const { data, error } = await sb
        .from("deletion_queue")
        .insert({
          resource_type,
          resource_id,
          user_id: user_id ?? null,
          requested_by: user.id,
          reason: reason ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await logAudit({
        actor_id: user.id, actor_email: user.email,
        event_type: "deletion_scheduled",
        resource_type, resource_id, severity: "warn",
        ip_address: meta.ip_address, user_agent: meta.user_agent,
        metadata: { reason },
      });
      return jsonResponse({ ok: true, deletion: data });
    }

    if (action === "cancel") {
      const { id } = body;
      const { error } = await sb.from("deletion_queue").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
      await logAudit({
        actor_id: user.id, actor_email: user.email,
        event_type: "deletion_cancelled",
        resource_type: "deletion_queue", resource_id: id, severity: "info",
        ip_address: meta.ip_address, user_agent: meta.user_agent,
      });
      return jsonResponse({ ok: true });
    }

    if (action === "confirm") {
      const { id } = body;
      const { data: row, error } = await sb.from("deletion_queue").select("*").eq("id", id).single();
      if (error) throw error;
      if (row.status === "executed") return jsonResponse({ ok: true });

      // Execute deletion based on resource_type
      if (row.resource_type === "case") {
        // delete cases + linked cephalo by patient? keep simple
        await sb.from("cases").delete().eq("id", row.resource_id);
      } else if (row.resource_type === "cephalometric_analysis") {
        const { data: ceph } = await sb.from("cephalometric_analyses").select("image_storage_path").eq("id", row.resource_id).maybeSingle();
        if (ceph?.image_storage_path) {
          await sb.storage.from("cephalometric-images").remove([ceph.image_storage_path]);
        }
        await sb.from("cephalometric_analyses").delete().eq("id", row.resource_id);
      } else if (row.resource_type === "user_account") {
        const uid = row.resource_id;
        // delete clinical data, then auth user
        await sb.from("cases").delete().eq("user_id", uid);
        await sb.from("cephalometric_analyses").delete().eq("user_id", uid);
        await sb.from("exam_comparisons").delete().eq("user_id", uid);
        await sb.from("case_feedback").delete().eq("user_id", uid);
        await sb.from("chat_conversations").delete().eq("user_id", uid);
        await sb.from("support_chats").delete().eq("user_id", uid);
        await sb.from("user_subscriptions").delete().eq("user_id", uid);
        await sb.from("user_roles").delete().eq("user_id", uid);
        await sb.from("profiles").delete().eq("user_id", uid);
        await sb.auth.admin.deleteUser(uid);
      }

      await sb.from("deletion_queue").update({
        status: "executed",
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
        executed_at: new Date().toISOString(),
      }).eq("id", id);

      await logAudit({
        actor_id: user.id, actor_email: user.email,
        event_type: "deletion_executed",
        resource_type: row.resource_type, resource_id: row.resource_id, severity: "critical",
        ip_address: meta.ip_address, user_agent: meta.user_agent,
        metadata: { reason: row.reason },
      });
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: "invalid action" }, 400);
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});