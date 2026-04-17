import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-api-key, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Limites por plano ────────────────────────────────────────────────────────
const PLAN_LIMITS: Record<string, number | null> = {
  basic:        100,
  professional: 500,
  enterprise:   null, // ilimitado
};

// ─── SHA256 via WebCrypto ─────────────────────────────────────────────────────
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startMs = Date.now();
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  // ── 1. Extrair API Key ──────────────────────────────────────────────────────
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "missing_api_key", message: "Header x-api-key obrigatório" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 2. Inicializar Supabase (service role para bypassar RLS) ───────────────
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── 3. Validar API Key ──────────────────────────────────────────────────────
  const keyHash = await sha256(apiKey);
  const { data: keyData, error: keyError } = await supabase
    .from("api_keys")
    .select("*, clinics(name, plan)")
    .eq("key_hash", keyHash)
    .eq("active", true)
    .single();

  if (keyError || !keyData) {
    return new Response(
      JSON.stringify({ error: "invalid_api_key", message: "API Key inválida ou revogada" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 4. Verificar quota ──────────────────────────────────────────────────────
  const now = new Date();
  const resetAt = new Date(keyData.usage_reset_at);

  // Reset mensal se necessário
  if (now > resetAt) {
    await supabase
      .from("api_keys")
      .update({
        usage_count: 0,
        usage_reset_at: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      })
      .eq("id", keyData.id);
    keyData.usage_count = 0;
  }

  const limit = PLAN_LIMITS[keyData.plan] ?? PLAN_LIMITS.basic;
  if (limit !== null && keyData.usage_count >= limit) {
    return new Response(
      JSON.stringify({
        error: "quota_exceeded",
        message: `Limite de ${limit} análises/mês atingido`,
        usage: keyData.usage_count,
        limit,
        reset_at: keyData.usage_reset_at,
        upgrade_url: "https://odontovision.com.br/planos",
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 5. Parsear body ─────────────────────────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "invalid_json", message: "Body deve ser JSON válido" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const {
    image_base64, image_type = "image/jpeg",
    file_name = "exam.jpg",
    exam_category = "radiografia",
    patient_name, patient_dob = "", patient_date = new Date().toISOString().split("T")[0],
    clinical_context = {},
  } = body;

  if (!image_base64) {
    return new Response(
      JSON.stringify({ error: "missing_image", message: "Campo image_base64 obrigatório" }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Verificar tamanho (~10MB base64 ≈ 7.5MB binário)
  if (image_base64.length > 13_000_000) {
    return new Response(
      JSON.stringify({ error: "payload_too_large", message: "Imagem maior que 10MB" }),
      { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── 6. Chamar analyze-exam internamente ────────────────────────────────────
  let analysis: any = null;
  let reviewScore: number | null = null;
  let reviewerFlags: string[] = [];
  let statusCode = 200;
  let errorMsg: string | null = null;

  try {
    const analyzeResp = await supabase.functions.invoke("analyze-exam", {
      body: {
        images: [{
          imageBase64: image_base64,
          imageType: image_type,
          fileName: file_name,
        }],
        examCategory: exam_category,
        examCategories: [exam_category],
        isMixedAnalysis: false,
        patientData: {
          nome: patient_name || "Não informado",
          dataNascimento: patient_dob,
          dataLaudo: patient_date,
        },
        clinicalContext: clinical_context,
      },
    });

    if (analyzeResp.error) throw new Error(analyzeResp.error.message);
    analysis = analyzeResp.data?.analysis;
    reviewScore = analyzeResp.data?.reviewScore ?? null;
    reviewerFlags = analyzeResp.data?.reviewerFlags ?? [];
  } catch (err: any) {
    statusCode = 500;
    errorMsg = err.message || "Erro interno na análise";
  }

  // ── 7. Salvar caso no banco ─────────────────────────────────────────────────
  let caseId: string | null = null;
  if (analysis) {
    try {
      const { data: caseData } = await supabase
        .from("cases")
        .insert([{
          user_id: keyData.clinic_id, // associar ao clinic_id como user proxy
          name: `${patient_name || "API"} - ${exam_category}`,
          exam_type: exam_category,
          file_name: file_name,
          file_type: image_type,
          status: "completed",
          analysis,
          reviewer_flags: reviewerFlags,
          review_score: reviewScore,
        }])
        .select("id")
        .single();
      caseId = caseData?.id ?? null;
    } catch {}
  }

  // ── 8. Atualizar uso ────────────────────────────────────────────────────────
  await supabase
    .from("api_keys")
    .update({
      usage_count: keyData.usage_count + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", keyData.id);

  // ── 9. Registrar log ────────────────────────────────────────────────────────
  await supabase.from("api_usage").insert([{
    api_key_id: keyData.id,
    clinic_id: keyData.clinic_id,
    endpoint: "/api/v1/analyze",
    status_code: statusCode,
    exam_category,
    processing_ms: Date.now() - startMs,
    ip_address: ip,
    error_message: errorMsg,
  }]);

  // ── 10. Disparar webhook (async, não bloqueia) ─────────────────────────────
  if (analysis && caseId) {
    supabase.functions.invoke("webhook-dispatcher", {
      body: {
        clinic_id: keyData.clinic_id,
        event: "analysis.completed",
        payload: {
          id: caseId,
          patient: { name: patient_name, dob: patient_dob },
          exam_category,
          analysis,
          review_score: reviewScore,
          created_at: new Date().toISOString(),
        },
      },
    }).catch(() => {}); // ignora erros — é async best-effort
  }

  // ── 11. Resposta ────────────────────────────────────────────────────────────
  if (statusCode !== 200) {
    return new Response(
      JSON.stringify({ error: "analysis_failed", message: errorMsg }),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      id: caseId,
      status: "completed",
      analysis,
      review_score: reviewScore,
      reviewer_flags: reviewerFlags,
      usage: { count: keyData.usage_count + 1, limit, reset_at: keyData.usage_reset_at },
      processing_ms: Date.now() - startMs,
      created_at: new Date().toISOString(),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
