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

async function detectLandmarksHF(imageUrl: string): Promise<Landmark[]> {
  const hfToken = Deno.env.get("HUGGINGFACE_API_KEY");
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error(`Falha ao baixar imagem: ${imgResp.status}`);
  const imageBlob = await imgResp.blob();
  const hfResp = await fetch(
    "https://api-inference.huggingface.co/models/cwlachap/hrnet-cephalometric-landmark-detection",
    {
      method: "POST",
      headers: { Authorization: hfToken ? `Bearer ${hfToken}` : "", "Content-Type": imageBlob.type || "image/jpeg" },
      body: imageBlob,
    }
  );
  if (!hfResp.ok) throw new Error(`HF API erro ${hfResp.status}: ${await hfResp.text()}`);
  const result = await hfResp.json();
  let raw: Array<[number,number]> = [];
  if (Array.isArray(result)) raw = result;
  else if (result.keypoints) raw = result.keypoints;
  else if (result.landmarks) raw = result.landmarks;
  else raw = Object.values(result) as Array<[number,number]>;
  return raw.slice(0,19).map((pt,i) => ({
    x: Array.isArray(pt) ? pt[0] : (pt as any).x,
    y: Array.isArray(pt) ? pt[1] : (pt as any).y,
    name: LANDMARK_NAMES[i] ?? `Landmark ${i+1}`,
    confidence: (pt as any).confidence ?? 0.85,
  }));
}

function generateDemoLandmarks(seed=1): Landmark[] {
  const base: [number,number][] = [
    [384,180],[420,200],[460,240],[520,220],[440,360],[430,430],[410,460],
    [400,510],[405,490],[350,500],[450,450],[460,380],[470,340],[460,420],
    [450,320],[400,480],[370,290],[470,300],[340,270],
  ];
  return base.map(([x,y],i) => ({ x:x+(seed*3%10)-5, y:y+(seed*7%10)-5, name:LANDMARK_NAMES[i], confidence:0.75+(i%4)*0.05 }));
}

function angle(p1: Landmark, v: Landmark, p2: Landmark): number {
  const a = { x: p1.x - v.x, y: p1.y - v.y };
  const b = { x: p2.x - v.x, y: p2.y - v.y };
  return Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) * (180 / Math.PI));
}
function distance(p1: Landmark, p2: Landmark): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2) * 0.1; // px → mm (factor estimado)
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
  if (!S || !N) throw new Error("Landmarks essenciais (S, N) nao detectados");

  switch (analysisType) {
    case "steiner": {
      if (!A || !B) throw new Error("Pontos A/B necessarios para Steiner");
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
      const mandPlane = Po && Or && Go && Me ? angle(Po, Or, Me) : 26;
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
      if (!Pog) throw new Error("Pogonio necessario para Downs");
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
}

async function generateInterpretation(m: Measurements, name: string): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (key) {
    try {
      const prompt = `Você é especialista em cefalometria. Analise as medidas do paciente ${name||"paciente"} e gere interpretação clínica em 3-4 frases em português:\nSNA:${m.SNA}° SNB:${m.SNB}° ANB:${m.ANB}° SN-GoGn:${m["SN-GoGn"]}° FMA:${m.FMA}° IMPA:${m.IMPA}° U1-NA:${m["U1-NA"]}° L1-NB:${m["L1-NB"]}° Overjet:${m.Overjet}mm Overbite:${m.Overbite}mm\nSeja técnico e objetivo.`;
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method:"POST",
        headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
        body:JSON.stringify({model:"gpt-4o",messages:[{role:"user",content:prompt}],max_tokens:300,temperature:0.3}),
      });
      if (r.ok) { const d=await r.json(); return d.choices?.[0]?.message?.content??""; }
    } catch {}
  }
  const p:string[]=[];
  if (m.SNA>85) p.push("Maxila protraída (SNA "+m.SNA+"°)");
  else if (m.SNA<79) p.push("Maxila retruída (SNA "+m.SNA+"°)");
  else p.push("Posição maxilar normal (SNA "+m.SNA+"°)");
  if (m.SNB>83) p.push("mandíbula protraída (SNB "+m.SNB+"°)");
  else if (m.SNB<77) p.push("mandíbula retruída (SNB "+m.SNB+"°)");
  if (m.ANB>5) p.push("relação Classe II (ANB "+m.ANB+"°)");
  else if (m.ANB<0) p.push("relação Classe III (ANB "+m.ANB+"°)");
  else p.push("relação maxilomandibular equilibrada (ANB "+m.ANB+"°)");
  if (m["SN-GoGn"]>38) p.push("padrão vertical aumentado");
  else if (m["SN-GoGn"]<26) p.push("padrão horizontal");
  return p.map((s,i)=>i===0?s.charAt(0).toUpperCase()+s.slice(1):s).join("; ")+".";
}

serve(async (req) => {
  if (req.method==="OPTIONS") return new Response(null,{headers:corsHeaders});
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const {imageUrl,userId,patientId,patientName,imageStoragePath} = await req.json();
    if (!imageUrl||!userId||!patientId)
      return new Response(JSON.stringify({error:"imageUrl, userId e patientId obrigatorios"}),
        {status:400,headers:{...corsHeaders,"Content-Type":"application/json"}});

    const {data:record,error:ie} = await supabase.from("cephalometric_analyses").insert({
      user_id:userId, patient_id:patientId, patient_name:patientName??null,
      image_url:imageUrl, image_storage_path:imageStoragePath??imageUrl,
      landmarks:[], measurements:{}, status:"processing",
    }).select().single();
    if (ie) throw new Error(ie.message);

    let landmarks:Landmark[], usedFallback=false;
    try { landmarks=await detectLandmarksHF(imageUrl); }
    catch(e) { console.warn("HF fallback:",(e as Error).message); landmarks=generateDemoLandmarks(Date.now()%100); usedFallback=true; }

    const measurements=calculateMeasurements(landmarks);
    const interpretation=await generateInterpretation(measurements,patientName??"");

    await supabase.from("cephalometric_analyses").update({
      landmarks, measurements, interpretation, status:"completed",
      error_message:usedFallback?"Landmarks demonstrativos (HF API indisponível)":null,
    }).eq("id",record.id);

    await supabase.from("cephalometric_analysis_history").insert({
      analysis_id:record.id, event_type:"completed",
      event_data:{landmarks_count:landmarks.length,used_fallback:usedFallback},
      created_by:userId,
    });

    return new Response(JSON.stringify({success:true,analysisId:record.id,landmarks,measurements,interpretation,usedFallback}),
      {status:200,headers:{...corsHeaders,"Content-Type":"application/json"}});
  } catch(err:any) {
    console.error("analyze-cephalometry:",err);
    return new Response(JSON.stringify({error:err.message}),
      {status:500,headers:{...corsHeaders,"Content-Type":"application/json"}});
  }
});
