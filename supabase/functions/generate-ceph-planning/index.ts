// supabase/functions/generate-ceph-planning/index.ts
//
// Edge Function: generate-ceph-planning
//
// Recebe uma sugestao de planeamento clinico gerada pelo motor deterministico
// no client (src/lib/cephalometric-planning/), revalida server-side com o
// filtro de seguranca, persiste em cephalometric_planning_suggestions e
// registra evento 'generated' em cephalometric_planning_audit_log.
//
// Estrategia escolhida: Engine roda no client; Edge Function valida, persiste
// e audita. Defesa em profundidade via re-execucao do safety filter no servidor.
//
// IMPORTANTE: a lista de termos bloqueados aqui DEVE ser identica a do client
// (src/lib/cephalometric-planning/safety-filter.ts). Quando incrementar
// CEPH_PLANNING_SAFETY_FILTER_VERSION, incrementar nos dois lugares.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  serviceClient,
  getUserFromRequest,
} from "../_shared/governance.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ============================================================================
// FILTRO DE SEGURANCA SERVER-SIDE (espelhado do client)
// ============================================================================

const BLOCKED_TERMS: ReadonlyArray<string> = [
  "garantido", "garantia de sucesso", "100% de sucesso", "sucesso garantido",
  "sem riscos", "sem efeitos colaterais", "totalmente seguro",
  "cura definitiva", "cura garantida", "resultado perfeito", "resultado garantido",
  "certeza absoluta", "definitivamente", "com certeza", "jamais", "nunca falha",
  "você deve fazer", "o paciente deve", "é obrigatório", "é imprescindível",
  "milagre", "milagroso", "revolucionário", "tratamento exclusivo",
];

const SAFETY_FILTER_VERSION_EXPECTED = "safety_filter_v1.0.0";

function validateTextSafety(text: string): { isSafe: boolean; blockedTerms: string[] } {
  const lower = (text || "").toLowerCase();
  const blocked: string[] = [];
  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term.toLowerCase())) {
      blocked.push(term);
    }
  }
  return { isSafe: blocked.length === 0, blockedTerms: blocked };
}

// ============================================================================
// VALIDACAO DE SCHEMA DA SUGESTAO
// ============================================================================

interface IncomingSuggestion {
  cephalometricAnalysisId: string;
  userId: string;
  status: string;
  dataSufficiencyScore: number;
  confidenceLevel: "low" | "medium" | "high";
  missingData: string[];
  blockingReasons: string[];
  inputMeasurementsSnapshot: Record<string, unknown>;
  clinicalContextSnapshot: Record<string, unknown>;
  summary: string;
  prioritizedProblems: string[];
  therapeuticObjectives: string[];
  treatmentAlternatives: string[];
  alertsAndLimitations: string[];
  patientFriendlyExplanation?: string;
  aiOriginalText: string;
  rulesVersion: string;
  templateVersion: string;
  safetyFilterVersion: string;
  generatedAt: string;
}

function validateSuggestionShape(s: unknown): { valid: boolean; reason?: string } {
  if (!s || typeof s !== "object") return { valid: false, reason: "suggestion ausente" };
  const x = s as Record<string, unknown>;
  const required = [
    "cephalometricAnalysisId", "status", "dataSufficiencyScore", "confidenceLevel",
    "summary", "aiOriginalText", "rulesVersion", "templateVersion", "safetyFilterVersion",
  ];
  for (const k of required) {
    if (x[k] === undefined || x[k] === null) {
      return { valid: false, reason: `campo obrigatorio ausente: ${k}` };
    }
  }
  if (typeof x.dataSufficiencyScore !== "number" || x.dataSufficiencyScore < 0 || x.dataSufficiencyScore > 100) {
    return { valid: false, reason: "dataSufficiencyScore fora do range 0-100" };
  }
  if (!["low", "medium", "high"].includes(x.confidenceLevel as string)) {
    return { valid: false, reason: "confidenceLevel invalido" };
  }
  return { valid: true };
}

// ============================================================================
// HELPERS DE RESPOSTA
// ============================================================================

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method not allowed" });
  }

  // 1. AUTENTICACAO
  const { user, error: authError } = await getUserFromRequest(req);
  if (!user) {
    return jsonResponse(401, { error: `unauthorized: ${authError ?? "no user"}` });
  }

  // 2. PARSE BODY
  let body: { cephalometric_analysis_id?: string; suggestion?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "invalid json body" });
  }

  const { cephalometric_analysis_id, suggestion } = body;

  if (!cephalometric_analysis_id || typeof cephalometric_analysis_id !== "string") {
    return jsonResponse(400, { error: "cephalometric_analysis_id obrigatorio" });
  }

  // 3. VALIDACAO DE SCHEMA
  const shape = validateSuggestionShape(suggestion);
  if (!shape.valid) {
    return jsonResponse(400, { error: `schema invalido: ${shape.reason}` });
  }

  const s = suggestion as IncomingSuggestion;

  // 4. VERIFICACAO DE COERENCIA: user_id no body deve bater com JWT
  if (s.userId !== user.id) {
    return jsonResponse(403, { error: "user_id do payload nao corresponde ao usuario autenticado" });
  }

  // 5. VERIFICACAO DE COERENCIA: analysis_id no body bate com URL
  if (s.cephalometricAnalysisId !== cephalometric_analysis_id) {
    return jsonResponse(400, { error: "cephalometric_analysis_id divergente entre payload e suggestion.cephalometricAnalysisId" });
  }

  // 6. VERIFICACAO DE VERSAO DO FILTRO
  if (s.safetyFilterVersion !== SAFETY_FILTER_VERSION_EXPECTED) {
    return jsonResponse(409, {
      error: `versao de filtro divergente. esperado: ${SAFETY_FILTER_VERSION_EXPECTED}, recebido: ${s.safetyFilterVersion}`,
    });
  }

  // 7. CLIENT COM JWT DO USUARIO (para INSERT em planning_suggestions sob RLS)
  const auth = req.headers.get("Authorization") || "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  // 8. VERIFICAR QUE A ANALISE EXISTE E PERTENCE AO USUARIO (via RLS)
  const { data: analysis, error: analysisErr } = await userClient
    .from("cephalometric_analyses")
    .select("id, user_id")
    .eq("id", cephalometric_analysis_id)
    .maybeSingle();

  if (analysisErr) {
    return jsonResponse(500, { error: `erro ao consultar analise: ${analysisErr.message}` });
  }
  if (!analysis) {
    return jsonResponse(404, { error: "analise cefalometrica nao encontrada ou sem acesso" });
  }

  // 9. RE-VALIDAR FILTRO DE SEGURANCA (defesa em profundidade)
  const safety = validateTextSafety(s.aiOriginalText);

  // Service client para gravar em audit_log (que so permite INSERT)
  const svc = serviceClient();

  if (!safety.isSafe) {
    // Grava evento safety_blocked e retorna erro
    await svc.from("cephalometric_planning_audit_log").insert({
      planning_suggestion_id: "00000000-0000-0000-0000-000000000000", // placeholder, sem registro persistido
      cephalometric_analysis_id,
      user_id: user.id,
      event_type: "safety_blocked",
      reason: `Termos bloqueados detectados server-side: ${safety.blockedTerms.join(", ")}`,
      rules_version: s.rulesVersion,
      template_version: s.templateVersion,
      safety_filter_version: s.safetyFilterVersion,
    });

    return jsonResponse(422, {
      error: "texto da sugestao bloqueado pelo filtro de seguranca server-side",
      blockedTerms: safety.blockedTerms,
    });
  }

  // 10. PERSISTIR A SUGESTAO
  const insertPayload = {
    cephalometric_analysis_id,
    user_id: user.id,
    status: s.status,
    data_sufficiency_score: s.dataSufficiencyScore,
    confidence_level: s.confidenceLevel,
    missing_data: s.missingData ?? [],
    blocking_reasons: s.blockingReasons ?? [],
    input_measurements_snapshot: s.inputMeasurementsSnapshot ?? {},
    clinical_context_snapshot: s.clinicalContextSnapshot ?? {},
    summary: s.summary,
    prioritized_problems: s.prioritizedProblems ?? [],
    therapeutic_objectives: s.therapeuticObjectives ?? [],
    treatment_alternatives: s.treatmentAlternatives ?? [],
    alerts_and_limitations: s.alertsAndLimitations ?? [],
    patient_friendly_explanation: s.patientFriendlyExplanation ?? null,
    ai_original_text: s.aiOriginalText,
    rules_version: s.rulesVersion,
    template_version: s.templateVersion,
    safety_filter_version: s.safetyFilterVersion,
    generated_at: s.generatedAt,
  };

  const { data: inserted, error: insertErr } = await userClient
    .from("cephalometric_planning_suggestions")
    .insert(insertPayload)
    .select()
    .single();

  if (insertErr || !inserted) {
    return jsonResponse(500, {
      error: `erro ao persistir sugestao: ${insertErr?.message ?? "unknown"}`,
    });
  }

  // 11. REGISTRAR EVENTO 'generated' NO AUDIT LOG (via service_role)
  const { error: auditErr } = await svc.from("cephalometric_planning_audit_log").insert({
    planning_suggestion_id: inserted.id,
    cephalometric_analysis_id,
    user_id: user.id,
    event_type: "generated",
    input_measurements_snapshot: s.inputMeasurementsSnapshot ?? {},
    clinical_context_snapshot: s.clinicalContextSnapshot ?? {},
    missing_data_list: s.missingData ?? [],
    data_sufficiency_score: s.dataSufficiencyScore,
    confidence_level: s.confidenceLevel,
    rules_version: s.rulesVersion,
    template_version: s.templateVersion,
    safety_filter_version: s.safetyFilterVersion,
    content_after: s.aiOriginalText,
  });

  // Mesmo se a auditoria falhar, a sugestao foi persistida; logamos no console
  // mas nao revertemos (audit log e best-effort fora do happy path).
  if (auditErr) {
    console.error("[generate-ceph-planning] audit log insert failed:", auditErr.message);
  }

  // 12. SUCESSO
  return jsonResponse(200, {
    success: true,
    planning_suggestion_id: inserted.id,
    suggestion: inserted,
    audit_logged: !auditErr,
  });
});
