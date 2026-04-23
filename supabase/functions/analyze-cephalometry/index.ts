import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Landmark { x: number; y: number; name: string; confidence: number; }
type Measurements = Record<string, number>;
type AnalysisType = "steiner" | "jarabak" | "mcnamara" | "ricketts" | "tweed" | "downs";

const LANDMARK_NAMES = [
  "Sella turcica","Nasion","Orbitale","Porion",
  "Subspinale (Point A)","Supramentale (Point B)","Pogonion","Menton","Gnathion","Gonion",
  "Lower Incisor Tip","Upper Incisor Tip","Upper Lip","Lower Lip","Subnasale",
  "Soft Tissue Pogonion","Posterior Nasal Spine","Anterior Nasal Spine","Articulare",
];

async function detectLandmarksGemini(imageUrl: string): Promise<Landmark[]> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

  // Download image and convert to base64 data URL (Gemini through gateway)
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error(`Falha ao baixar imagem: ${imgResp.status}`);
  const contentType = imgResp.headers.get("content-type") || "image/jpeg";
  const buf = new Uint8Array(await imgResp.arrayBuffer());
  let bin = ""; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const b64 = btoa(bin);
  const dataUrl = `data:${contentType};base64,${b64}`;

  // Get image dimensions via createImageBitmap
  const bitmap = await createImageBitmap(new Blob([buf], { type: contentType }));
  const W = bitmap.width, H = bitmap.height;
  bitmap.close?.();

  const tool = {
    type: "function",
    function: {
      name: "report_landmarks",
      description: "Reporta as coordenadas normalizadas (0-1) dos 19 landmarks cefalométricos detectados na telerradiografia lateral.",
      parameters: {
        type: "object",
        properties: {
          landmarks: {
            type: "array",
            description: "Lista dos 19 landmarks cefalométricos.",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Nome canônico do landmark", enum: LANDMARK_NAMES },
                x: { type: "number", description: "Coordenada X normalizada 0-1 (esquerda→direita da imagem)" },
                y: { type: "number", description: "Coordenada Y normalizada 0-1 (topo→base da imagem)" },
                confidence: { type: "number", description: "Confiança 0-1" },
              },
              required: ["name", "x", "y", "confidence"],
              additionalProperties: false,
            },
          },
        },
        required: ["landmarks"],
        additionalProperties: false,
      },
    },
  };

  const body = {
    model: "google/gemini-2.5-pro",
    messages: [
      {
        role: "system",
        content: "Você é um especialista em cefalometria. Identifique com precisão os 19 landmarks cefalométricos padrão na telerradiografia lateral fornecida. Retorne SEMPRE coordenadas normalizadas no intervalo [0,1] relativas à imagem (x = horizontal, y = vertical, com origem no canto superior esquerdo).",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Detecte e retorne os 19 landmarks cefalométricos desta telerradiografia lateral usando a função report_landmarks. Seja preciso anatomicamente." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    tools: [tool],
    tool_choice: { type: "function", function: { name: "report_landmarks" } },
  };

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (r.status === 429) throw new Error("RATE_LIMIT");
  if (r.status === 402) throw new Error("PAYMENT_REQUIRED");
  if (!r.ok) {
    const t = await r.text();
    console.error("Gemini error", r.status, t);
    throw new Error(`Gemini erro ${r.status}`);
  }
  const data = await r.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("Sem tool_call retornado");
  let args: any;
  try { args = JSON.parse(call.function.arguments); }
  catch { throw new Error("Argumentos do tool_call inválidos"); }
  const raw: Array<{ name: string; x: number; y: number; confidence: number }> = args.landmarks ?? [];
  if (!raw.length) throw new Error("Nenhum landmark retornado");

  // Convert normalized → pixel
  return raw.map((l) => ({
    name: l.name,
    x: Math.max(0, Math.min(1, l.x)) * W,
    y: Math.max(0, Math.min(1, l.y)) * H,
    confidence: typeof l.confidence === "number" ? l.confidence : 0.85,
  }));
}

function angle(p1: Landmark, v: Landmark, p2: Landmark): number {
  const a = { x: p1.x - v.x, y: p1.y - v.y };
  const b = { x: p2.x - v.x, y: p2.y - v.y };
  return Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) * (180 / Math.PI));
}
function distance(p1: Landmark, p2: Landmark): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) * 0.1;
}
const r = (v: number) => Math.round(v * 10) / 10;

function calculateMeasurementsByAnalysis(landmarks: Landmark[], analysisType: AnalysisType): Measurements {
  const lm = new Map(landmarks.map(l => [l.name, l]));
  const S  = lm.get("Sella turcica");
  const N  = lm.get("Nasion");
  const A  = lm.get("Subspinale (Point A)");
  const B  = lm.get("Supramentale (Point B)");
  const Go = lm.get("Gonion");
  const Me = lm.get("Menton");
  const Gn = lm.get("Gnathion");
  const Or = lm.get("Orbitale");
  const Po = lm.get("Porion");
  const Pog = lm.get("Pogonion");
  const Ar = lm.get("Articulare");
  const ENA = lm.get("Anterior Nasal Spine");
  const Sn = lm.get("Subnasale");
  const STPog = lm.get("Soft Tissue Pogonion");
  const U1 = lm.get("Upper Incisor Tip");
  const L1 = lm.get("Lower Incisor Tip");
  if (!S || !N) return {};

  switch (analysisType) {
    case "steiner": {
      if (!A || !B) return {};
      const SNA = angle(S, N, A), SNB = angle(S, N, B);
      return {
        SNA: r(SNA), SNB: r(SNB), ANB: r(SNA - SNB),
        "SN-GoGn": r(Go && Gn ? angle(S, N, Gn) : 32),
        FMA: r(Po && Or && Go ? angle(Po, Or, Go) : 25),
        IMPA: r(L1 && Go && Me ? angle(L1, Me, Go) : 90),
        "U1-NA": r(U1 ? angle(U1, N, A) : 22),
        "L1-NB": r(L1 ? angle(L1, N, B) : 25),
      };
    }
    case "jarabak": {
      const NSAr = Ar ? angle(N, S, Ar) : 123;
      const SArGo = Ar && Go ? angle(S, Ar, Go) : 143;
      const ArGoMe = Ar && Go && Me ? angle(Ar, Go, Me) : 130;
      const SGo = Go ? distance(S, Go) * 10 : 80;
      const NMe = Me ? distance(N, Me) * 10 : 120;
      return {
        SellaAngle: r(NSAr), ArticularAngle: r(SArGo), GonialAngle: r(ArGoMe),
        PosteriorFH: r(SGo), AnteriorFH: r(NMe),
        JarabakRatio: r((SGo / NMe) * 100),
      };
    }
    case "mcnamara": {
      const CoA = Ar && A ? distance(Ar, A) * 10 : 91;
      const CoGn = Ar && Gn ? distance(Ar, Gn) * 10 : 120;
      const ANperp = A ? (A.x - N.x) * 0.1 : 1;
      const PogNperp = Pog ? (Pog.x - N.x) * 0.1 : -2;
      const LAFH = ENA && Me ? distance(ENA, Me) * 10 : 67;
      return {
        "Co-A": r(CoA), "Co-Gn": r(CoGn),
        MaxMand: r(CoGn - CoA),
        "A-Nperp": r(ANperp),
        "Pog-Nperp": r(PogNperp),
        LAFH: r(LAFH),
      };
    }
    case "ricketts": {
      const facialAxis = Pog && Ar ? angle(Pog, S, Ar) : 90;
      const facialDepth = Po && Or && Pog ? angle(Po, Or, Pog) : 87;
      const mandPlane = Po && Or && Me ? angle(Po, Or, Me) : 26;
      const lowerFaceH = ENA && Pog && Me ? angle(ENA, Pog, Me) : 47;
      const conv = A && Pog ? Math.abs(A.x - ((N.x + Pog.x) / 2)) * 0.1 : 2;
      const l1E = L1 && STPog && Sn ? Math.abs(L1.x - ((STPog.x + Sn.x) / 2)) * 0.1 * -1 : -2;
      return {
        FacialAxis: r(facialAxis), FacialDepth: r(facialDepth),
        MandPlane: r(mandPlane), LowerFaceH: r(lowerFaceH),
        ConvFacial: r(conv), "L1-Eplane": r(l1E),
      };
    }
    case "tweed": {
      const FMA = Po && Or && Go && Me ? angle(Po, Or, Me) : 25;
      const IMPA = L1 && Go && Me ? angle(L1, Me, Go) : 90;
      const FMIA = 180 - FMA - IMPA;
      return {
        FMA: r(FMA), FMIA: r(FMIA), IMPA: r(IMPA),
        TweedSum: r(FMA + FMIA + IMPA),
      };
    }
    case "downs": {
      if (!Pog) return {};
      const facialAngle = Po && Or ? angle(Po, Or, Pog) : 87;
      const angConv = A ? angle(N, A, Pog) - 180 : 0;
      const ABplane = A && B ? angle(A, B, Pog) - 180 : -4.6;
      const mandPlane = Po && Or && Me ? angle(Po, Or, Me) : 22;
      const yAxis = Gn && Po && Or ? angle(Po, Or, Gn) : 59.4;
      const u1L1 = U1 && L1 ? angle(U1, S, L1) : 135.4;
      return {
        FacialAngle: r(facialAngle),
        AngConvex: r(angConv),
        ABplane: r(ABplane),
        MandPlane: r(mandPlane),
        YAxis: r(yAxis),
        "U1-L1": r(u1L1),
      };
    }
  }
  return {};
}

async function generateInterpretation(m: Measurements, analysisType: AnalysisType, name: string): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const measureLines = Object.entries(m).map(([k, v]) => `${k}: ${v}`).join(" | ");
  if (!apiKey) {
    return `Análise ${analysisType.toUpperCase()} concluída. Medidas: ${measureLines}.`;
  }
  try {
    const prompt = `Você é especialista em cefalometria. Análise: ${analysisType.toUpperCase()}. Paciente: ${name || "paciente"}. Gere interpretação clínica em 3-4 frases em português, baseada nas medidas:\n${measureLines}\nSeja técnico, objetivo e cite a análise utilizada.`;
    const r2 = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (r2.ok) {
      const d = await r2.json();
      return d.choices?.[0]?.message?.content ?? "";
    }
  } catch (e) { console.warn("interpretation failed", e); }
  return `Análise ${analysisType.toUpperCase()} concluída. Medidas: ${measureLines}.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json();
    const { imageUrl, userId, patientId, patientName, imageStoragePath } = body;
    // Accept either single analysisType OR array analysisTypes
    let analysisTypes: AnalysisType[] = [];
    if (Array.isArray(body.analysisTypes)) analysisTypes = body.analysisTypes;
    else if (body.analysisType) analysisTypes = [body.analysisType];
    else analysisTypes = ["steiner"];
    if (!analysisTypes.length) analysisTypes = ["steiner"];

    if (!imageUrl || !userId || !patientId) {
      return new Response(JSON.stringify({ error: "imageUrl, userId e patientId obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const primaryType = analysisTypes[0];
    const { data: record, error: ie } = await supabase.from("cephalometric_analyses").insert({
      user_id: userId, patient_id: patientId, patient_name: patientName ?? null,
      image_url: imageUrl, image_storage_path: imageStoragePath ?? imageUrl,
      landmarks: [], measurements: {}, status: "processing", analysis_type: primaryType,
    }).select().single();
    if (ie) throw new Error(ie.message);

    let landmarks: Landmark[];
    try {
      landmarks = await detectLandmarksGemini(imageUrl);
    } catch (e: any) {
      const msg = e?.message ?? "Falha na detecção";
      await supabase.from("cephalometric_analyses").update({
        status: "failed", error_message: msg,
      }).eq("id", record.id);
      let userMsg = "Não foi possível detectar landmarks — tente uma imagem mais nítida.";
      let status = 500;
      if (msg === "RATE_LIMIT") { userMsg = "Limite de requisições atingido. Aguarde alguns instantes."; status = 429; }
      if (msg === "PAYMENT_REQUIRED") { userMsg = "Créditos de IA esgotados — adicione créditos em Lovable AI."; status = 402; }
      return new Response(JSON.stringify({ error: userMsg }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: Record<string, { measurements: Measurements; interpretation: string }> = {};
    const allMeasurements: Measurements = {};
    let combinedInterpretation = "";
    for (const t of analysisTypes) {
      const measurements = calculateMeasurementsByAnalysis(landmarks, t);
      const interpretation = await generateInterpretation(measurements, t, patientName ?? "");
      results[t] = { measurements, interpretation };
      Object.assign(allMeasurements, measurements);
      combinedInterpretation += (combinedInterpretation ? "\n\n" : "") + `[${t.toUpperCase()}] ${interpretation}`;
    }

    await supabase.from("cephalometric_analyses").update({
      landmarks, measurements: allMeasurements,
      interpretation: combinedInterpretation, status: "completed",
      error_message: null,
    }).eq("id", record.id);

    await supabase.from("cephalometric_analysis_history").insert({
      analysis_id: record.id, event_type: "completed",
      event_data: { landmarks_count: landmarks.length, analysis_types: analysisTypes },
      created_by: userId,
    });

    // Backwards-compat fields kept; new clients should use `results`
    const primary = results[primaryType];
    return new Response(JSON.stringify({
      success: true,
      analysisId: record.id,
      landmarks,
      measurements: primary.measurements,
      interpretation: primary.interpretation,
      analysisType: primaryType,
      analysisTypes,
      results,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("analyze-cephalometry:", err);
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
