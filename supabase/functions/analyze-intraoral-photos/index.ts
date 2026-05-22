// supabase/functions/analyze-intraoral-photos/index.ts
//
// Edge Function: analyze-intraoral-photos (Fase 1 — descritivo, sob demanda)
//
// Recebe { analysisId }, busca as fotos intrabucais da analise (bucket privado,
// via signed URL), envia ao modelo de visao (Claude via Lovable Gateway) com
// um prompt de guard-rail estrito, aplica safety-filter na saida, persiste em
// ceph_intraoral_ai_analysis e audita.
//
// REGRAS CLINICAS (Fase 1):
// - Saida APENAS descritiva. NUNCA diagnostico conclusivo, plano de tratamento,
//   nem mencao a medidas cefalometricas (SNA/ANB/etc).
// - As fotos sao documentacao complementar. NUNCA substituem a telerradiografia
//   nem alimentam a deteccao de landmarks (analyze-cephalometry).
//
// Template: analyze-exam (payload OpenAI-compatible) + _shared/governance.ts.
// Safety filter espelhado de generate-ceph-planning.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  serviceClient,
  getUserFromRequest,
  jsonResponse,
  logAudit,
} from "../_shared/governance.ts";

// ============================================================================
// SAFETY FILTER (espelhado de generate-ceph-planning)
// ============================================================================
const BLOCKED_TERMS: ReadonlyArray<string> = [
  "garantido", "garantia de sucesso", "100% de sucesso", "sucesso garantido",
  "sem riscos", "sem efeitos colaterais", "totalmente seguro",
  "cura definitiva", "cura garantida", "resultado perfeito", "resultado garantido",
  "certeza absoluta", "definitivamente", "com certeza", "jamais", "nunca falha",
  "milagre", "milagroso", "revolucionário", "tratamento exclusivo",
];
const SAFETY_FILTER_VERSION = "intraoral_ai_safety_v1.0.0";

function sanitizeSafety(text: string): { text: string; flagged: string[] } {
  let out = text || "";
  const flagged: string[] = [];
  for (const term of BLOCKED_TERMS) {
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (re.test(out)) {
      flagged.push(term);
      out = out.replace(re, "[termo removido]");
    }
  }
  return { text: out, flagged };
}

// ============================================================================
// CATEGORIAS (labels PT-BR, espelhado do client)
// ============================================================================
const CATEGORY_LABELS: Record<string, string> = {
  frontal: "Frontal",
  lateral_direita: "Lateral Direita",
  lateral_esquerda: "Lateral Esquerda",
  oclusal_superior: "Oclusal Superior",
  oclusal_inferior: "Oclusal Inferior",
  complementar: "Complementar",
};

// ============================================================================
// SYSTEM PROMPT — GUARD-RAIL CLINICO (spec §8)
// ============================================================================
const SYSTEM_PROMPT = `Você é um assistente de DOCUMENTAÇÃO clínica odontológica. Sua função é descrever, de forma objetiva, o que é VISUALMENTE OBSERVÁVEL em fotografias intrabucais de documentação ortodôntica.

REGRAS ABSOLUTAS E INEGOCIÁVEIS:
1. Produza APENAS observações descritivas do que está visível ("é aparente", "observa-se", "sugestivo de"). NUNCA emita diagnóstico conclusivo.
2. NUNCA proponha plano de tratamento, conduta terapêutica ou prognóstico.
3. NUNCA mencione, calcule ou infira medidas cefalométricas (SNA, SNB, ANB, FMA, ângulos, etc). Essas medidas vêm de outra fonte e não são seu papel.
4. Use SEMPRE linguagem de incerteza apropriada. Você está vendo fotos, não examinando o paciente.
5. Para cada observação, indique de qual categoria de foto ela vem.
6. NUNCA use linguagem de certeza ou garantia (garantido, cura, definitivamente, etc).
7. Você é APOIO À DOCUMENTAÇÃO. A interpretação e o diagnóstico são responsabilidade exclusiva do dentista habilitado.

FORMATO DA RESPOSTA (texto corrido, em português):
- Uma breve observação descritiva por categoria de foto recebida.
- Ao final, SEMPRE inclua: "Observações de apoio à documentação. Não constituem diagnóstico. A avaliação clínica e o diagnóstico são de responsabilidade do dentista habilitado."

Se uma foto tiver qualidade insuficiente para qualquer observação, declare isso explicitamente para aquela categoria.`;

// ============================================================================
// HELPERS
// ============================================================================
async function urlToBase64DataUrl(url: string, mime: string | null): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary);
    return `data:${mime || "image/jpeg"};base64,${b64}`;
  } catch {
    return null;
  }
}

// ============================================================================
// HANDLER
// ============================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  try {
    // 1. Auth
    const user = await getUserFromRequest(req);
    if (!user?.id) {
      return jsonResponse({ error: "Não autenticado" }, 401);
    }

    // 2. Input
    const body = await req.json().catch(() => ({}));
    const analysisId = body?.analysisId as string | undefined;
    if (!analysisId) {
      return jsonResponse({ error: "analysisId ausente" }, 400);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return jsonResponse({ error: "LOVABLE_API_KEY ausente no servidor" }, 500);
    }

    const db = serviceClient();

    // 3. Buscar fotos da analise, confirmando ownership (defesa extra ao RLS)
    const { data: photos, error: photosErr } = await db
      .from("ceph_intraoral_photos")
      .select("category, storage_path, mime_type")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (photosErr) {
      return jsonResponse({ error: `Falha ao buscar fotos: ${photosErr.message}` }, 500);
    }
    if (!photos || photos.length === 0) {
      return jsonResponse({ error: "Nenhuma foto intrabucal anexada a esta análise." }, 400);
    }

    // 4. Signed URLs -> base64
    const contentArray: any[] = [
      {
        type: "text",
        text: `As imagens a seguir são fotos intrabucais de documentação ortodôntica, identificadas por categoria. Descreva objetivamente o que é visualmente observável em cada uma, seguindo rigorosamente as regras do sistema. Categorias recebidas, nesta ordem: ${photos.map((p: any) => CATEGORY_LABELS[p.category] ?? p.category).join(", ")}.`,
      },
    ];

    let usable = 0;
    for (const p of photos as any[]) {
      const { data: signed } = await db.storage
        .from("intraoral-photos")
        .createSignedUrl(p.storage_path, 600);
      if (!signed?.signedUrl) continue;
      const dataUrl = await urlToBase64DataUrl(signed.signedUrl, p.mime_type);
      if (!dataUrl) continue;
      contentArray.push({
        type: "text",
        text: `Categoria: ${CATEGORY_LABELS[p.category] ?? p.category}`,
      });
      contentArray.push({ type: "image_url", image_url: { url: dataUrl } });
      usable++;
    }

    if (usable === 0) {
      return jsonResponse({ error: "Não foi possível carregar as fotos para análise." }, 502);
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: contentArray },
    ];

    // 5. Chamar gateway (claude-opus-4-5; fallback gemini-2.5-flash)
    async function callModel(model: string) {
      return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, max_tokens: 2000, temperature: 0.2 }),
      });
    }

    let modelUsed = "claude-opus-4-5";
    let apiResp = await callModel(modelUsed);
    if (!apiResp.ok) {
      modelUsed = "google/gemini-2.5-flash";
      apiResp = await callModel(modelUsed);
    }
    if (!apiResp.ok) {
      const errTxt = await apiResp.text().catch(() => "");
      return jsonResponse({ error: `Falha no modelo de visão: ${apiResp.status} ${errTxt.slice(0, 200)}` }, 502);
    }

    const apiJson = await apiResp.json();
    const rawText: string = apiJson?.choices?.[0]?.message?.content ?? "";
    if (!rawText.trim()) {
      return jsonResponse({ error: "Resposta vazia do modelo de visão." }, 502);
    }

    // 6. Safety filter
    const { text: safeText } = sanitizeSafety(rawText);

    // 7. Persistir
    const { data: inserted, error: insErr } = await db
      .from("ceph_intraoral_ai_analysis")
      .insert({
        analysis_id: analysisId,
        user_id: user.id,
        result_text: safeText,
        photos_count: usable,
        model_used: modelUsed,
        safety_filter_version: SAFETY_FILTER_VERSION,
      })
      .select()
      .single();

    if (insErr) {
      return jsonResponse({ error: `Falha ao salvar análise: ${insErr.message}` }, 500);
    }

    // 8. Auditoria (nao bloqueia em caso de falha)
    try {
      await logAudit({
        userId: user.id,
        action: "intraoral_ai_analysis",
        detail: { analysisId, photosCount: usable, modelUsed },
      } as any);
    } catch (_) { /* auditoria nao bloqueia resposta */ }

    return jsonResponse({
      ok: true,
      analysis: inserted,
    }, 200);
  } catch (e: any) {
    return jsonResponse({ error: e?.message ?? "Erro inesperado" }, 500);
  }
});
