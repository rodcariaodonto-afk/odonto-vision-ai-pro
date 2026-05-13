import {
  corsHeaders,
  getUserFromRequest,
  isAdmin,
  serviceClient,
  logAudit,
  clientMeta,
  jsonResponse,
} from "../_shared/governance.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) return jsonResponse({ error: "unauthorized" }, 401);
    const body = await req.json().catch(() => ({}));
    const scope: "user" | "account" | "case" = body.scope ?? "user";
    const targetUserId: string = body.user_id ?? user.id;
    const caseId: string | undefined = body.case_id;

    const admin = await isAdmin(user.id);
    if (targetUserId !== user.id && !admin) {
      return jsonResponse({ error: "forbidden" }, 403);
    }

    const sb = serviceClient();
    const meta = clientMeta(req);

    // Insert export record
    const { data: exportRow, error: insErr } = await sb
      .from("data_exports")
      .insert({
        user_id: targetUserId,
        case_id: caseId ?? null,
        requested_by: user.id,
        scope,
        status: "processing",
      })
      .select()
      .single();
    if (insErr) throw insErr;

    const payload: Record<string, unknown> = {
      export_id: exportRow.id,
      scope,
      generated_at: new Date().toISOString(),
      generated_by: { id: user.id, email: user.email },
      target_user_id: targetUserId,
    };

    // profile + subscription
    payload.profile = (await sb.from("profiles").select("*").eq("user_id", targetUserId).maybeSingle()).data;
    payload.subscription = (await sb.from("user_subscriptions").select("*").eq("user_id", targetUserId).maybeSingle()).data;
    payload.consents = (await sb.from("consents").select("*").eq("user_id", targetUserId)).data ?? [];

    // cases (sem binários — apenas referências)
    let casesQ = sb
      .from("cases")
      .select("id,name,exam_type,status,file_name,file_type,patient_folder,created_at,updated_at,analysis,visual_analysis")
      .eq("user_id", targetUserId);
    if (scope === "case" && caseId) casesQ = casesQ.eq("id", caseId);
    payload.cases = (await casesQ).data ?? [];

    payload.cephalometric_analyses =
      (await sb.from("cephalometric_analyses").select("id,patient_name,patient_id,analysis_type,status,measurements,interpretation,image_storage_path,created_at,updated_at").eq("user_id", targetUserId)).data ?? [];
    payload.exam_comparisons =
      (await sb.from("exam_comparisons").select("*").eq("user_id", targetUserId)).data ?? [];
    payload.case_feedback =
      (await sb.from("case_feedback").select("*").eq("user_id", targetUserId)).data ?? [];
    payload.chat_conversations =
      (await sb.from("chat_conversations").select("id,title,created_at,updated_at").eq("user_id", targetUserId)).data ?? [];
    payload.support_chats =
      (await sb.from("support_chats").select("*").eq("user_id", targetUserId)).data ?? [];
    if ((payload.support_chats as unknown[]).length) {
      const chatIds = (payload.support_chats as Array<{ id: string }>).map((c) => c.id);
      payload.support_messages =
        (await sb.from("support_messages").select("*").in("chat_id", chatIds)).data ?? [];
    }
    if (admin) {
      payload.audit_logs =
        (await sb.from("audit_logs").select("*").eq("actor_id", targetUserId).order("created_at", { ascending: false }).limit(1000)).data ?? [];
    }

    payload.notice =
      "Imagens, radiografias, fotografias e anexos binários NÃO foram incluídos por padrão. Apenas metadados e referências foram exportados.";

    const json = JSON.stringify(payload, null, 2);
    const path = `${targetUserId}/${exportRow.id}.json`;
    const { error: upErr } = await sb.storage
      .from("governance-exports")
      .upload(path, new Blob([json], { type: "application/json" }), { upsert: true, contentType: "application/json" });
    if (upErr) throw upErr;

    const { data: signed } = await sb.storage
      .from("governance-exports")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    const { data: updated } = await sb
      .from("data_exports")
      .update({
        status: "completed",
        storage_path: path,
        file_url: signed?.signedUrl ?? null,
        completed_at: new Date().toISOString(),
        metadata: {
          counts: {
            cases: (payload.cases as unknown[]).length,
            cephalometric_analyses: (payload.cephalometric_analyses as unknown[]).length,
            exam_comparisons: (payload.exam_comparisons as unknown[]).length,
            chat_conversations: (payload.chat_conversations as unknown[]).length,
            support_chats: (payload.support_chats as unknown[]).length,
          },
        },
      })
      .eq("id", exportRow.id)
      .select()
      .single();

    await logAudit({
      actor_id: user.id,
      actor_email: user.email,
      event_type: "export_download",
      resource_type: "data_export",
      resource_id: exportRow.id,
      severity: "warn",
      ip_address: meta.ip_address,
      user_agent: meta.user_agent,
      metadata: { scope, target_user_id: targetUserId, case_id: caseId ?? null },
    });

    return jsonResponse({ ok: true, export: updated });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});