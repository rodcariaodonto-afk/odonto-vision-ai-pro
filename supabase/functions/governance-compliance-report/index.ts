import {
  corsHeaders, getUserFromRequest, isAdmin, serviceClient, jsonResponse,
} from "../_shared/governance.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user } = await getUserFromRequest(req);
    if (!user) return jsonResponse({ error: "unauthorized" }, 401);
    if (!(await isAdmin(user.id))) return jsonResponse({ error: "forbidden" }, 403);

    const sb = serviceClient();
    const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const [
      cases, ceph, comparisons, chats, supports, profiles, admins, subs,
      exports_, dsr, deletions, criticalEvents, policy, consents,
    ] = await Promise.all([
      sb.from("cases").select("id", { count: "exact", head: true }),
      sb.from("cephalometric_analyses").select("id", { count: "exact", head: true }),
      sb.from("exam_comparisons").select("id", { count: "exact", head: true }),
      sb.from("chat_conversations").select("id", { count: "exact", head: true }),
      sb.from("support_chats").select("id", { count: "exact", head: true }),
      sb.from("profiles").select("id", { count: "exact", head: true }),
      sb.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin"),
      sb.from("user_subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      sb.from("data_exports").select("id,created_at,scope,status").order("created_at", { ascending: false }).limit(50),
      sb.from("data_subject_requests").select("id,status,request_type,created_at,due_date"),
      sb.from("deletion_queue").select("id,status,resource_type,scheduled_for"),
      sb.from("audit_logs").select("id,event_type,created_at").eq("severity", "critical").gte("created_at", since30),
      sb.from("retention_policies").select("*").eq("singleton", true).maybeSingle(),
      sb.from("consents").select("consent_type,consent_status"),
    ]);

    const consentSummary: Record<string, Record<string, number>> = {};
    for (const c of consents.data ?? []) {
      const t = (c as any).consent_type;
      const s = (c as any).consent_status;
      consentSummary[t] = consentSummary[t] || {};
      consentSummary[t][s] = (consentSummary[t][s] || 0) + 1;
    }

    const risks: string[] = [];
    if (!policy.data?.clinical_access_logging) risks.push("Logging de acesso clínico desabilitado");
    const openDsr = (dsr.data ?? []).filter((d: any) => d.status === "open" || d.status === "in_progress");
    const overdueDsr = openDsr.filter((d: any) => new Date(d.due_date) < new Date());
    if (overdueDsr.length) risks.push(`${overdueDsr.length} pedido(s) de titular em atraso`);
    if ((criticalEvents.data ?? []).length > 50) risks.push("Volume elevado de eventos críticos nos últimos 30 dias");
    if ((admins.count ?? 0) > 5) risks.push("Número elevado de administradores — revisar privilégios");

    return jsonResponse({
      generated_at: new Date().toISOString(),
      counts: {
        cases: cases.count ?? 0,
        cephalometric_analyses: ceph.count ?? 0,
        exam_comparisons: comparisons.count ?? 0,
        chat_conversations: chats.count ?? 0,
        support_chats: supports.count ?? 0,
        profiles: profiles.count ?? 0,
        admins: admins.count ?? 0,
        active_subscriptions: subs.count ?? 0,
      },
      retention_policy: policy.data,
      recent_exports: exports_.data ?? [],
      data_subject_requests: {
        total: (dsr.data ?? []).length,
        open: openDsr.length,
        overdue: overdueDsr.length,
      },
      deletion_queue: {
        total: (deletions.data ?? []).length,
        pending: (deletions.data ?? []).filter((d: any) => d.status === "pending").length,
      },
      critical_events_30d: (criticalEvents.data ?? []).length,
      consents_summary: consentSummary,
      rls_coverage: {
        tables_with_rls: [
          "cases","profiles","user_subscriptions","cephalometric_analyses",
          "chat_conversations","exam_comparisons","support_chats","support_messages",
          "case_feedback","user_roles","data_exports","audit_logs",
          "data_subject_requests","consents","retention_policies","deletion_queue",
        ],
      },
      risks,
    });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});